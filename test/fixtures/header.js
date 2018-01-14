module.exports = `
<div class="header">
  <div class="center">
    <h1><a href="{{ _url() }}">{{ config.title }}</a></h1>
    <p>{{ config.description }}more</p>
    <div class="menu">
    {% for u in config.menu %}
      <a href="{{ _url(u) }}">{{ __('menu.' + loop.key) }}</a>
    {% endfor %}
    </div>
  </div>
</div>
`