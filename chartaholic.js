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
        if ( typeof tippy !== "undefined" ) {
            let elements = document.querySelectorAll( ".tippy-popper" );
            for ( let element of elements ) {
                element.outerHTML = "";
            }
        }
        const delta = Math.sign( event.deltaY );
        this.zoom += delta;
        this.render();
    }

    // roc(source, length) = 100 * change(source, length) / source
    // mom(source, length) Momentum of x price and x price y bars ago. This is simply a difference x - x[y]
    // rma(source, length) Moving average used in RSI. It is the exponentially weighted moving average with alpha = 1 / length.
    // atr(atrlen) average true range returns the RMA of true range. True range is max(high - low, abs(high - close[1]), abs(low - close[1]))
    // pivothigh https://uk.tradingview.com/study-script-reference/#fun_pivothigh
    // pivotlow https://uk.tradingview.com/study-script-reference/#fun_pivotlow
    // percentile_nearest_rank https://uk.tradingview.com/study-script-reference/#fun_percentile_nearest_rank

    // at(x) return position from end of series: at(1) at(0)
    at( series, offset = 0 ) {
        if ( !series ) return 0;
        console.log( series );
        let start = series.length - offset;
        return series.slice( --start, ++start );
    }

    // pow(base, exponent) returns base to exponent power
    pow( base, exponent ) {
        return Math.pow( base, exponent );
    }

    timex( x ) {
        return ( x - this.min_time ) / this.delta_time * this.margin_x;
    }
    dx( x ) {
        return ( x - this.min_x ) / this.delta_x * this.margin_x;
    }
    dy( y ) {
        return this.margin_y - ( y - this.min_y ) / this.delta_y * this.margin_y;
    }

    calculateTicks( min, max, tickCount = 10 ) {
        let span = max - min,
            step = Math.pow( 10, Math.floor( Math.log( span / tickCount ) / Math.LN10 ) ),
            err = tickCount / span * step;

        // Filter ticks to get closer to the desired count
        if ( err <= .15 ) step *= 10;
        else if ( err <= .35 ) step *= 5;
        else if ( err <= .75 ) step *= 2;

        // Round start and stop values to step interval
        let tstart = Math.ceil( min / step ) * step,
            tstop = Math.floor( max / step ) * step + step * .5,
            ticks = [];

        for ( let i = tstart; i < tstop; i += step ) {
            ticks.push( i );
        }
        return ticks;
    }

    text( x, y, string, className = "", anchor = "start", alignment = "hanging", size = false ) {
        let element = document.createElementNS( this.namespace, "text" );
        if ( size ) element.style.fontSize = `${size}px`;
        element.setAttributeNS( null, "class", className );
        element.setAttributeNS( null, "text-anchor", anchor );
        element.setAttributeNS( null, "alignment-baseline", alignment );
        element.setAttributeNS( null, "x", x );
        element.setAttributeNS( null, "y", y );
        element.innerHTML = string;
        return element;
    }

    render( json = false ) {
        this.width = this.target.clientWidth;
        this.height = this.target.clientHeight;
        if ( !json ) json = this.data;
        let data = json.slice( this.zoom * -7 );
        this.wickpadding = this.width > 1500 ? 4 : this.width > 1000 ? 2 : 1;
        //let maxwidth = this.width / ( data.length - 1 ) - this.wickpadding;
        let wickwidth = 0.6, halfwick = wickwidth / 2;
        this.margin_x = this.width - this.margin_right;
        this.margin_y = this.height - this.margin_bottom;
        if ( this.smoothing ) { // heikin ashi, etc
            /*console.info( data );
            data = this.ha( data );
            console.info( data );*/
        }
        this.drawn = {};
        this.last_tick = data.slice( -1 )[0];
        this.min_x = Math.min( ...data.map( d => d.x ) );
        this.max_x = Math.max( ...data.map( d => d.x ) ) + 0.5;
        this.min_y = Math.min( ...data.map( d => d.l ) );
        this.max_y = Math.max( ...data.map( d => d.h ) );
        this.min_time = Math.min( ...data.map( d => d.time ) );
        this.max_time = Math.max( ...data.map( d => d.time ) );
        this.ticks_x = this.calculateTicks( this.min_time, this.max_time, 10 );
        this.ticks_y = this.calculateTicks( this.min_y, this.max_y, 14 );
        this.delta_y = this.max_y - this.min_y;
        this.delta_x = this.max_x - this.min_x;
        this.delta_time = this.max_time - this.min_time;
        //this.mid_x = ( this.min_x + this.min_y ) / 2;
        //this.mid_y = ( this.max_y + this.min_y ) / 2;
        //console.log( `delta: ${this.delta_x}, ${this.delta_y}` );
        //console.info( `min_x: ${this.min_x}, min_y: ${this.min_y}, max_x: ${this.max_x}, max_y: ${this.max_y}` );
        //let x_ticks = scaleTicks(TICK_COUNT, MAX_X, MIN_X);
        //let y_ticks = [MAX_Y, (MAX_Y + MIN_Y) / 2, MIN_Y];
        //let dateFormat = 'll'; // https://momentjs.com
        //let xticks = show_time ? quartileBounds(data.map(d => d.time)).map(v => `<div data-value='${moment(v).format(dateFormat)}'></div>`) : x_ticks.map(v => `<div data-value='${format(v, precision)}'></div>`);
        //let yticks = MAX_Y > 999 ? y_ticks.map(v => `<div data-value='${usd(v)}'></div>`) :  y_ticks.map(v => `<div data-value='${format(v, precision)}'></div>`);
        let svg = document.createElementNS( this.namespace, "svg" ), color;
        //svg.style.strokeWidth = "1px";
        svg.style.width = `${this.width}px`;
        svg.style.height = `${this.height}px`;
        svg.setAttributeNS( null, "class", this.theme );
        svg.setAttributeNS( null, "width", this.width );
        svg.setAttributeNS( null, "height", this.height );
        const last_close = this.last_tick.c;
        const today = moment();
        //daily open 'day'
        const week_open = today.startOf( 'week' ), week_cal = week_open.calendar();
        const month_open = today.startOf( 'month' ), month_cal = month_open.calendar();
        const quarter_open = today.startOf( 'quarter' ), quarter_cal = quarter_open.calendar();
        const year_open = today.startOf( 'year' ), year_cal = year_open.calendar();
        if ( month_cal == year_cal ) this.drawn.month_open = true;
        if ( quarter_cal == year_cal ) this.drawn.quarter_open = true;
        //if ( week_cal == year_cal || typeof this.drawn. ) this.drawn.week_open = true;
        let tooltip_class = typeof tippy == 'undefined' ? 'title' : 'data-tippy-content';
        let closest = this.ticks_y.reduce( function ( prev, curr ) {
            return ( Math.abs( curr - last_close ) < Math.abs( prev - last_close ) ? curr : prev );
        } );
        //console.log( this.ticks_x );
        for ( let x of this.ticks_x ) {
            let dx = this.timex( x );
            //console.log( x, dx );
            let element = document.createElementNS( this.namespace, 'path' );
            element.setAttributeNS( null, 'class', 'grid' );
            element.setAttributeNS( null, 'd', `M${dx},0L${dx},${this.height - this.margin_bottom}` );
            svg.appendChild( element );
            svg.appendChild( this.text( dx, this.height - 2, moment( x ).format( 'MMM D' ), 'xaxis', 'middle', 'start' ) );
        }
        let tick_distance = ( this.ticks_y[1] - this.ticks_y[0] ) / 3;
        for ( let y of this.ticks_y ) {
            let element = document.createElementNS( this.namespace, 'path' );
            element.setAttributeNS( null, 'class', 'grid' );
            element.setAttributeNS( null, 'd', `M0,${this.dy( y )}L${this.width - ( this.margin_right * 0.275 )},${this.dy( y )}` );
            svg.appendChild( element );
            if ( y == closest && Math.abs( closest - last_close ) < tick_distance ) continue;
            svg.appendChild( this.text( this.width, this.dy( y ), this.autoformat( y ).replace( '$', '' ).replace( /,/g, '' ), 'axis', 'end', 'middle' ) );
        }
        let size = ( this.width / data.length ) - 5;
        if ( size < 5 ) size = 5;
        if ( size > 20 ) size = 20;
        for ( let tick of data ) {
            ////////////////////////////////////////////////////
            if ( this.structure ) {
                let d = moment( tick.time ), cal = d.calendar();
                color = this.last_tick.c >= tick.o ? 'green' : 'red';
                let alignment = 'middle';
                // Yearly Open
                if ( year_cal == cal && typeof this.drawn.year_open == 'undefined' ) { // year_open.isSame( d, 'd' )
                    let element = document.createElementNS( this.namespace, 'path' );
                    element.setAttributeNS( null, 'class', 'structure' );
                    element.setAttributeNS( null, 'd', `M${this.dx( tick.x )},${this.dy( tick.o )}L${this.dx( this.width )},${this.dy( tick.o )}` );
                    element.setAttributeNS( null, tooltip_class, this.autoformat( tick.o ) );
                    this.drawn.year_open = tick.o;
                    svg.appendChild( element );
                    let textelement = this.text( this.width, this.dy( tick.o ) + 1, 'Yearly Open', 'structure ' + color, 'end', alignment, size );
                    textelement.setAttributeNS( null, tooltip_class, this.autoformat( tick.o ) );
                    svg.appendChild( textelement );
                }
                // Quarterly Open
                if ( quarter_cal == cal && typeof this.drawn.quarter_open == 'undefined' ) {
                    let element = document.createElementNS( this.namespace, 'path' );
                    element.setAttributeNS( null, 'class', 'structure tip' );
                    element.setAttributeNS( null, 'd', `M${this.dx( tick.x )},${this.dy( tick.o )}L${this.dx( this.width )},${this.dy( tick.o )}` );
                    element.setAttributeNS( null, tooltip_class, this.autoformat( tick.o ) );
                    this.drawn.quarter_open = tick.o;
                    svg.appendChild( element );
                    let textelement = this.text( this.width, this.dy( tick.o ) + 1, 'Quarterly Open', 'structure ' + color, 'end', alignment, size );
                    textelement.setAttributeNS( null, tooltip_class, this.autoformat( tick.o ) );
                    svg.appendChild( textelement );
                }
                // Monthly Open
                if ( month_cal == cal && typeof this.drawn.month_open == 'undefined' ) {
                    console.log( "monthly open", last_close, tick.o, color );
                    let element = document.createElementNS( this.namespace, 'path' );
                    element.setAttributeNS( null, 'class', 'structure tip' );
                    element.setAttributeNS( null, 'd', `M${this.dx( tick.x )},${this.dy( tick.o )}L${this.dx( this.width )},${this.dy( tick.o )}` );
                    this.drawn.month_open = tick.o;
                    svg.appendChild( element );
                    let textelement = this.text( this.width, this.dy( tick.o ) + 1, 'Monthly Open', 'structure ' + color, 'end', alignment, size );
                    textelement.setAttributeNS( null, tooltip_class, this.autoformat( tick.o ) );
                    svg.appendChild( textelement );
                }
                // Weekly Open
                if ( week_cal == cal && typeof this.drawn.week_open == 'undefined' ) {
                    let element = document.createElementNS( this.namespace, 'path' );
                    element.setAttributeNS( null, 'class', 'structure tip' );
                    element.setAttributeNS( null, 'd', `M${this.dx( tick.x )},${this.dy( tick.o )}L${this.dx( this.width )},${this.dy( tick.o )}` );
                    element.setAttributeNS( null, tooltip_class, this.autoformat( tick.o ) );
                    this.drawn.week_open = tick.o;
                    svg.appendChild( element );
                    let textelement = this.text( this.width, this.dy( tick.o ) + 1, 'Weekly Open', 'structure ' + color, 'end', alignment, size );
                    textelement.setAttributeNS( null, tooltip_class, this.autoformat( tick.o ) );
                    svg.appendChild( textelement );
                }
            }
            color = tick.c >= tick.o ? 'up' : 'down';
            let candle = document.createElementNS( this.namespace, 'path' );
            candle.setAttributeNS( null, 'class', `${color} tip` );
            candle.setAttributeNS( null, 'd', `M${this.dx( tick.x + halfwick )},${this.dy( tick.h )}L${this.dx( tick.x + halfwick )},${this.dy( tick.l )}M${this.dx( tick.x )},${this.dy( tick.o )}L${this.dx( tick.x + wickwidth )},${this.dy( tick.o )}L${this.dx( tick.x + wickwidth )},${this.dy( tick.c )}L${this.dx( tick.x )},${this.dy( tick.c )}Z` );
            candle.setAttributeNS( null, tooltip_class, `<b>${moment( tick.time ).calendar()}</b><br/><b>Open:</b> ${tick.o}<br/><b>High:</b> ${tick.h}<br/><b>Low:</b> ${tick.l}<br/><b>Close:</b> ${tick.c}` );
            svg.appendChild( candle );
        }
        /////////////////////////////////////////////////
        /*let element = document.createElementNS( this.namespace, 'path' );
        element.setAttributeNS( null, 'class', 'black' );
        element.setAttributeNS( null, 'd', `M${marginx},0L${marginx},${this.height}` );
        svg.appendChild( element );*/
        color = this.last_tick.c >= this.last_tick.o ? 'up' : 'down'
        //svg.appendChild( this.text( marginx, this.dy( this.last_tick.c ), this.autoformat( this.last_tick.c ), 'lastprice ' + color, 'start', 'middle', size + 5 ) );
        svg.appendChild( this.text( this.width, this.dy( last_close ), this.autoformat( last_close ), 'lastprice', 'end', 'middle' ) ); //'lastprice ' + color
        if ( this.title ) svg.appendChild( this.text( 0, 1, this.title, 'headline' ) );
        //onmousemove='debounce(mousemove(event),20)' onmouseout='mouseout()'
        //<text id='mousex' alignment-baseline='hanging' x='0' y='0'></text>
        //<text id='mousey' alignment-baseline='baseline' x='0' y='${HEIGHT}'></text>
        //this.target.onresize = this.resize.bind( this );
        this.target.innerHTML = "";
        this.target.appendChild( svg );
        if ( typeof tippy !== "undefined" ) tippy( ".tip", { theme: "light", arrow: true, a11y: false } );
        /////////////////////////////////////////////////
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
    sats( number ) {
        if ( number <= 0.0001 ) return Math.round( number * 1e8 ) + " sats";
        return new Intl.NumberFormat( 'en-US', { style: 'decimal', minimumFractionDigits: 1, maximumFractionDigits: 8 } ).format( number );
    }
    usd( number, maxdigits = 2, mindigits = 0 ) {
        let result = Intl.NumberFormat( 'en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: mindigits, maximumFractionDigits: maxdigits } ).format( number );
        if ( mindigits == 0 ) return result.replace( /\.00$/, '' );
        return result;
    }
    format( number, maxPrecision = 8, minPrecision = 0 ) {
        return new Intl.NumberFormat( 'en-US', { style: 'decimal', minimumFractionDigits: minPrecision, maximumFractionDigits: maxPrecision } ).format( number );
    }
    autoformat( number ) {
        if ( number >= 1000 ) return this.usd( number, 2, 0 );
        if ( number >= 100 ) return this.usd( number, 4, 0 );
        if ( number >= 10 ) return this.usd( number, 4, 0 );
        if ( number < 10 ) return this.format( number, 8, 1 )
        if ( number <= 0.1 ) return this.sats( number );//this.format( number, 8, 2 )
        return this.format( number );
    }

    constructor( target, options = {} ) {
        this.namespace = "http://www.w3.org/2000/svg";
        this.zoom = 0; //31
        this.target = typeof target == "string" ? document.querySelector( target ) : target;
        this.theme = typeof options.theme == "undefined" ? "standard" : options.theme;
        this.title = typeof options.title == "undefined" ? "" : options.title;
        this.keys = typeof options.keys == "undefined" ? {} : options.keys;
        //this.analysis = typeof options.analysis == "undefined" ? false : options.analysis;
        this.structure = typeof options.structure == "undefined" ? false : options.structure;
        this.smoothing = typeof options.smoothing == "undefined" ? false : options.smoothing;
        this.margin_right = 100;
        this.margin_bottom = 13;
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
