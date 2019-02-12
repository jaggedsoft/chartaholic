class Chartaholic {
    reset() {
        this.zoom = 0;
        this.count = 0;
        this.opens = [];
        this.highs = [];
        this.lows = [];
        this.closes = [];
        this.times = [];
        this.data = [];
    }

    // ticks: pass an array of ohlc values.
    // keys: default open, high, low, close, time
    import( ticks ) {
        for ( let key of ['open', 'high', 'low', 'close', 'time'] ) {
            if ( typeof this.keys[key] === "undefined" ) this.keys[key] = key;
        }
        this.reset();
        for ( let tick of ticks ) {
            let time = new Date( tick[this.keys.time] ).getTime();
            let open = Number( tick[this.keys.open] );
            let high = Number( tick[this.keys.high] );
            let low = Number( tick[this.keys.low] );
            let close = Number( tick[this.keys.close] );
            this.opens.push( open );
            this.highs.push( high );
            this.lows.push( low );
            this.closes.push( close );
            this.times.push( time );
            this.data.push( {
                x: this.count++,
                o: open,
                h: high,
                l: low,
                c: close,
                time: time
            } );
        }
    }

    resize() {
        this.width = this.target.clientWidth;
        this.height = this.target.clientHeight;
        this.render();
    }

    scroll( event ) {
        const delta = Math.sign( event.deltaY );
        this.zoom += delta;
        this.render();
    }

    dx( x ) {
        return ( x - this.min_x ) / this.delta_x * this.width;
    }
    dy( y ) {
        return this.height - ( y - this.min_y ) / this.delta_y * this.height;
    }

    render( json = false ) {
        this.width = this.target.clientWidth;
        this.height = this.target.clientHeight;
        if ( !json ) json = this.data;
        let data = json.slice( this.zoom * -7 );
        this.wickpadding = this.width > 1500 ? 4 : this.width > 1000 ? 2 : 1;
        //let maxwidth = this.width / ( data.length - 1 ) - this.wickpadding;
        this.wickwidth = 0.6; //.5
        this.min_x = Math.min( ...data.map( d => d.x ) );
        this.max_x = Math.max( ...data.map( d => d.x ) ) + 0.5;
        this.min_y = Math.min( ...data.map( d => d.l ) );
        this.max_y = Math.max( ...data.map( d => d.h ) );
        this.mid_y = ( this.max_y + this.min_y ) / 2;
        this.delta_y = this.max_y - this.min_y;
        this.delta_x = this.max_x - this.min_x;
        let wickwidth = this.wickwidth, halfwick = this.wickwidth / 2;
        //console.log( `delta: ${this.delta_x}, ${this.delta_y}` );
        //console.info( `min_x: ${this.min_x}, min_y: ${this.min_y}, max_x: ${this.max_x}, max_y: ${this.max_y}` );
        //let x_ticks = scaleTicks(TICK_COUNT, MAX_X, MIN_X);
        //let y_ticks = [MAX_Y, (MAX_Y + MIN_Y) / 2, MIN_Y];
        //let dateFormat = 'll'; // https://momentjs.com
        //let xticks = show_time ? quartileBounds(data.map(d => d.time)).map(v => `<div data-value='${moment(v).format(dateFormat)}'></div>`) : x_ticks.map(v => `<div data-value='${format(v, precision)}'></div>`);
        //let yticks = MAX_Y > 999 ? y_ticks.map(v => `<div data-value='${usd(v)}'></div>`) :  y_ticks.map(v => `<div data-value='${format(v, precision)}'></div>`);
        let namespace = "http://www.w3.org/2000/svg", svg = document.createElementNS( namespace, "svg" );
        svg.style.strokeWidth = "1px";//`${this.wickwidth}px`;
        svg.style.width = `${this.width}px`;
        svg.style.height = `${this.height}px`;
        svg.setAttributeNS( null, "class", this.theme );
        svg.setAttributeNS( null, "width", this.width );
        svg.setAttributeNS( null, "height", this.height );
        for ( let tick of data ) {
            let color = tick.c >= tick.o ? 'up' : 'down';
            let candle = document.createElementNS( namespace, 'path' );
            candle.setAttributeNS( null, 'class', `${color}` );
            candle.setAttributeNS( null, 'd', `M${this.dx( tick.x + halfwick )},${this.dy( tick.h )}L${this.dx( tick.x + halfwick )},${this.dy( tick.l )}M${this.dx( tick.x )},${this.dy( tick.o )}L${this.dx( tick.x + wickwidth )},${this.dy( tick.o )}L${this.dx( tick.x + wickwidth )},${this.dy( tick.c )}L${this.dx( tick.x )},${this.dy( tick.c )}Z` );
            candle.setAttributeNS( null, typeof tippy == 'undefined' ? 'title' : 'data-tippy-content', `<b>${new Date( tick.time ).toLocaleString()}</b><br/><b>Open:</b> ${tick.o}<br/><b>High:</b> ${tick.h}<br/><b>Low:</b> ${tick.l}<br/><b>Close:</b> ${tick.c}` );
            svg.appendChild( candle );
        }
        if ( this.title ) {
            //ticks += `<text alignment-baseline='hanging' x='0' y='1' class='headline'>${this.title}</text>`;
            let text = document.createElementNS( namespace, "text" );
            text.setAttributeNS( null, "class", "headline" );
            text.setAttributeNS( null, "alignment-baseline", "hanging" );
            text.setAttributeNS( null, "x", "0" );
            text.setAttributeNS( null, "y", "1" );
            text.innerHTML = this.title;
            svg.appendChild( text );
        }
        //onmousemove='debounce(mousemove(event),20)' onmouseout='mouseout()'
        //<text id='mousex' alignment-baseline='hanging' x='0' y='0'></text>
        //<text id='mousey' alignment-baseline='baseline' x='0' y='${HEIGHT}'></text>
        //this.target.onresize = this.resize.bind( this );
        this.target.innerHTML = "";
        this.target.appendChild( svg );
        if ( typeof tippy !== "undefined" ) tippy( "path", { theme: "light", arrow: true, sticky: true, a11y: false } );
        //return this.target.innerHTML = `<svg width='${this.width}' height='${this.height}' class='${this.theme}' style='stroke-width:${this.wickwidth}px' onresize='this.resize'>${ticks}</svg>`;
    }

    getTicks( count, max ) {
        return [...Array( count ).keys()].map( d => max / ( count - 1 ) * parseInt( d ) )
    }
    scaleTicks( count, max, min ) {
        return [...Array( count ).keys()].map( d => max / ( count - 1 ) * parseInt( d ) )
        //return [...Array(count).keys()].map(d => (max - min) / (count - 1) * parseInt(d))
    }
    nz( value, def = 0 ) {
        return isFinite( value ) ? value : def;
    }
    usd( number, maxdigits = 2, mindigits = 0 ) {
        return new Intl.NumberFormat( 'en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: mindigits, maximumFractionDigits: maxdigits } ).format( number );
    }
    format( number, maxPrecision = 8, minPrecision = 0 ) {
        return new Intl.NumberFormat( 'en-US', { style: 'decimal', minimumFractionDigits: minPrecision, maximumFractionDigits: maxPrecision } ).format( number );
    }

    constructor( target, options = {} ) {
        this.zoom = 0; //31
        this.target = typeof target == "string" ? document.querySelector( target ) : target;
        this.theme = typeof options.theme == "undefined" ? "standard" : options.theme;
        this.title = typeof options.title == "undefined" ? "" : options.title;
        //this.width = typeof options.width == "undefined" ? window.innerWidth * 0.9 : options.width;
        //this.height = typeof options.height == "undefined" ? window.innerHeight * 0.8 : options.height;
        this.keys = typeof options.keys == "undefined" ? {} : options.keys;
        this.reset();
        window.addEventListener( 'resize', this.resize.bind( this ) );
        this.target.addEventListener( 'wheel', this.scroll.bind( this ) );
        if ( typeof options.ticks !== "undefined" ) {
            this.import( options.ticks );
            this.render();
        }
    }
}
if ( typeof module !== 'undefined' && module.exports ) module.exports = Chartaholic;
