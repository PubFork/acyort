const assert = require('power-assert')
const fs = require('fs-extra')
const pathFn = require('path')
const Config = require('acyort-config')
const Render = require('acyort-render')
const cheerio = require('cheerio')
const puppeteer = require('puppeteer')
const Acyort = require('../lib/acyort')

const i18nTpl = require('./fixtures/i18n')
const categoriesTpl = require('./fixtures/categories')
const layoutTpl = require('./fixtures/layout')
const styleTpl = require('./fixtures/style')

const base = pathFn.resolve(__dirname, '../assets')
const renderer = new Render()

String.prototype.trim = function() {
  return this.replace(/\n/g, '')
}

function dir(path) {
  return pathFn.join(base, path)
}

function sleep(t = 0) {
  return new Promise(resolve => {
    setTimeout(resolve, t)
  })
}

function getBodyStyle() {
  const body = document.querySelector('body');
  return (JSON.parse(JSON.stringify(getComputedStyle(body)))).backgroundColor
}

function text(path, tag) {
  const html = fs.readFileSync(dir(path))
  const $ = cheerio.load(html)
  return $(tag).text().trim()
}

const config = new Config({ base, renderer }).value
const themeDir = pathFn.join(base, 'themes', config.theme)

const origin = {
  i18n: fs.readFileSync(`${themeDir}/i18n/${config.language}.yml`),
  style: fs.readFileSync(`${themeDir}/source/css/style.css`),
  layout: fs.readFileSync(`${themeDir}/layout/layout.html`),
  categories: fs.readFileSync(`${themeDir}/layout/categories.html`),
}

config.cache = true

describe('acyort', () => {
  it('server', async function () {
    this.timeout(20000)

    after(function() {
      fs.writeFileSync(`${themeDir}/i18n/${config.language}.yml`, origin.i18n)
      fs.writeFileSync(`${themeDir}/source/css/style.css`, origin.style)
      fs.writeFileSync(`${themeDir}/layout/layout.html`, origin.layout)
      fs.writeFileSync(`${themeDir}/layout/categories.html`, origin.categories)
      fs.removeSync(`${themeDir}/source/images/newheader.jpg`)
    })

    const acyort = new Acyort(config)
    await acyort.start(2222)

    const browser = await puppeteer.launch()
    const page = await browser.newPage()
    await page.goto('http://127.0.0.1:2222')

    let color = await page.evaluate(getBodyStyle)
    assert(text('category/index.html', '.head-tag') === 'Categories')
    assert(color === 'rgb(255, 255, 255)')

    fs.copySync(`${themeDir}/source/images/header.jpg`, `${themeDir}/source/images/newheader.jpg`)
    await sleep(1000)
    assert(fs.existsSync(dir(`${config.public_dir}/images/newheader.jpg`)) === true)

    fs.writeFileSync(`${themeDir}/i18n/${config.language}.yml`, i18nTpl)
    await sleep(1000)
    assert(text('category/index.html', '.head-tag') === 'new Categories')

    fs.writeFileSync(`${themeDir}/source/css/style.css`, styleTpl)
    await sleep(1000)
    color = await page.evaluate(getBodyStyle)
    assert(color === 'rgb(221, 221, 221)')

    fs.writeFileSync(`${themeDir}/layout/layout.html`, layoutTpl)
    await sleep(1000)
    assert(text('category/index.html', '#special') === 'special')

    fs.writeFileSync(`${themeDir}/layout/categories.html`, categoriesTpl)
    await sleep(1000)
    assert(text('category/index.html', '.head-tag') === 'new Categoriesmore')

    await browser.close()
    acyort.server.close()
  })

  it('build', async function () {
    this.timeout(10000)

    const acyort = new Acyort(config)
    await acyort.build()

    'css,post,index.html,page,category,about'
      .split(',')
      .forEach((tag) => {
        assert(fs.existsSync(dir(tag)) === true)
      })

    assert(text('index.html', 'title') === config.title)
    assert(text('tag/index.html', 'title') === 'Tags | AcyOrt')
    assert(text('post/71470122.html', '#post h1') === '输入框输入值自动格式化')
    assert(text('post/223304114.html', '#开发选择') === '开发选择')
    assert(text('about/index.html', '.footer a') === 'Powered by Github | AcyOrtSource')
  })
})
