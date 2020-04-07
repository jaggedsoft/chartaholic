[![Latest Version](https://img.shields.io/github/release/jaggedsoft/chartaholic.svg?style=flat-square)](https://github.com/jaggedsoft/chartaholic/releases) [![GitHub last commit](https://img.shields.io/github/last-commit/jaggedsoft/chartaholic.svg?maxAge=2400)](#) <!--[![Downloads](https://img.shields.io/npm/dm/chartaholic.svg?labelColor=blueviolet)](https://npm-stat.com/charts.html?package=chartaholic&from=2017-07-01&to=2020-04-01) [![npm downloads](https://img.shields.io/npm/dt/chartaholic.svg?maxAge=7200)](https://www.npmjs.com/package/chartaholic) --> [![jaggedsoft on Twitter](https://img.shields.io/twitter/follow/jaggedsoft.svg?style=social)](https://twitter.com/jaggedsoft)

This software is licensed as free to use, but you must share improvements to the source code by sending pull requests to this repository.

#### Examples
![Indicator Example](https://cdn.discordapp.com/attachments/538472814626209793/697188143409004615/darkpool-liquidity.png)
![Binance Futures: BTC](https://cdn.discordapp.com/attachments/538472814626209793/697187567937912902/darkpool.png)
![Binance OGN-BTC](https://cdn.discordapp.com/attachments/538472814626209793/697188018217549824/darkpool.png)
> The goal is to become an open source alternative to TradingView with built-in functions available in Javascript.

#### Getting Started
```js
let chart = new Chartaholic( "#chart", { ticks: ohlc } );
let chart = new Chartaholic( "#chart", { theme: "blue", keys: { time: "time_open" }, ticks, title, usd:true, overlay, annotations } );
```
> This software is open source and depends on contributions from the community. Under the GNU GPL v3 License, you are given permission to use this freely for any purpose you like, with no liability and no warranty, as long as you make the source code of any improvements available for all.

[![Views](http://hits.dwyl.io/jaggedsoft/chartaholic.svg)](http://hits.dwyl.io/jaggedsoft/chartaholic)
