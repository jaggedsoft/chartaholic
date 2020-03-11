class Chartaholic {
    reset() {
        this.zoom = 0;
        this.count = 0;
        this.opens = [];
        this.highs = [];
        this.lows = [];
        this.closes = [];
        this.times = [];
        this.volume = [];
        this.data = [];
    }

    // Append new candle
    append( tick, draw = true ) {
        let time = new Date( tick[this.keys.time] ).getTime();
        let open = Number( tick[this.keys.open] );
        let high = Number( tick[this.keys.high] );
        let low = Number( tick[this.keys.low] );
        let close = Number( tick[this.keys.close] );
        let volume = typeof tick[this.keys.volume] == "undefined" ? 0 : Number( tick[this.keys.volume] );
        this.opens.push( open );
        this.highs.push( high );
        this.lows.push( low );
        this.closes.push( close );
        this.times.push( time );
        this.volume.push( volume );
        this.data.push( {
            x: this.count++,
            o: open,
            h: high,
            l: low,
            c: close,
            v: volume,
            time: time
        } );
        if ( draw ) this.render();
    }

    // Replace last candle
    update( tick, draw = true ) {
        let offset = this.data.length - 1;
        this.data[offset] = tick;
        if ( draw ) this.render();
    }

    // Update OHLC of last candle from trade stream
    updateOHLC( amount, volume = 0, draw = true ) {
        let offset = this.data.length - 1, tick = this.data[offset];
        if ( amount > tick.h ) this.data[offset].h = amount;
        else if ( amount < tick.l ) this.data[offset].l = amount;
        this.data[offset].c = amount;
        this.data[offset].v += volume;
        if ( draw ) this.render();
    }

    // Replace all OHLC tick values
    import( ticks, draw = true ) {
        for ( let key of ['open', 'high', 'low', 'close', 'volume', 'time'] ) {
            if ( typeof this.keys[key] === "undefined" ) this.keys[key] = key;
        }
        this.reset();
        for ( let tick of ticks ) {
            this.append( tick, false );
        }
        if ( draw ) this.render();
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
        //console.info( "zoom: " + this.zoom );
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

    percent( min, max, width = 100 ) {
        return ( min * 0.01 ) / ( max * 0.01 ) * width;
    }

    getPrecision( float ) {
        if ( !float || Number.isInteger( float ) ) return 0;
        let digits = float.toString().split( '.' )[1];
        return typeof digits.length == "undefined" ? 0 : digits.length;
    }

    // Drawing functions: convert world space to screen space
    timex( x ) {
        return ( x - this.min_time ) / this.time_range * this.margin_x;
    }
    dx( x ) {
        return ( x - this.min_x ) / this.range_x * this.margin_x;
    }
    dy( y ) {
        return this.margin_y - ( y - this.min_y ) / this.range_y * this.margin_y;
    }

    // Generate range of timestamps starting from the end
    timeRange( start, end, results = 7 ) {
        let range = [], delta = end - start, step = Math.ceil( delta / ( results - 1 ) );
        for ( let n = end; n > start; n -= step ) {
            range.unshift( parseInt( n ) );
            //let closest = this.get_closest( this.times, n );
            //range.unshift( parseInt( closest ) );
        }
        return range;
    }
    calculateTicks( min, max, results = 10 ) {
        let ticks = [], span = max - min,
            step = Math.pow( 10, Math.floor( Math.log( span / results ) / Math.LN10 ) ),
            err = results / span * step;

        // Filter ticks to get closer to the desired count
        if ( err <= .15 ) step *= 10;
        else if ( err <= .35 ) step *= 5;
        else if ( err <= .75 ) step *= 2;

        // Round start and stop values to step interval
        let tstart = Math.ceil( min / step ) * step,
            tstop = Math.floor( max / step ) * step + step * .5;

        for ( let i = tstart; i < tstop; i += step ) {
            ticks.push( i );
        }
        return ticks;
    }

    get_closest( array, n ) {
        return array.reduce( function ( prev, curr ) {
            return ( Math.abs( curr - n ) < Math.abs( prev - n ) ? curr : prev );
        } );
    }

    text( x, y, string, className = "", anchor = "start", alignment = "hanging", size = false ) {
        let element = document.createElementNS( this.namespace, "text" );
        if ( size ) element.style.fontSize = `${size}px`;
        element.setAttributeNS( null, "class", className );
        element.setAttributeNS( null, "text-anchor", anchor );
        element.setAttributeNS( null, "dominant-baseline", alignment );
        element.setAttributeNS( null, "x", x );
        element.setAttributeNS( null, "y", y );
        element.textContent = string;
        return element;
    }

    regress( x, y ) {
        if ( x === false ) {
            let blank = [];
            for ( let i = 0; i < y.length; i++ ) {
                blank.push( i );
            }
            x = blank;
        }
        const n = y.length;
        let sx = 0;
        let sy = 0;
        let sxy = 0;
        let sxx = 0;
        let syy = 0;
        for ( let i = 0; i < n; i++ ) {
            sx += x[i];
            sy += y[i];
            sxy += x[i] * y[i];
            sxx += x[i] * x[i];
            syy += y[i] * y[i];
        }
        const mx = sx / n;
        const my = sy / n;
        const yy = n * syy - sy * sy;
        const xx = n * sxx - sx * sx;
        const xy = n * sxy - sx * sy;
        const slope = xy / xx;
        const intercept = my - slope * mx;
        const r = xy / Math.sqrt( xx * yy );
        const r2 = Math.pow( r, 2 );
        //let sst = 0;
        //for (let i = 0; i < n; i++) {
        //   sst += Math.pow((y[i] - my), 2);
        //}
        //const sse = sst - r2 * sst;
        //const see = Math.sqrt(sse / (n - 2));
        //const ssr = sst - sse;
        //sse, ssr, sst, sy, sx, see
        var s2x, s2y, s2, s, xbar = sx / n;
        s2x = ( n * sxx - sx * sx ) / n / ( n - 1 );
        s2y = ( n * syy - sy * sy ) / n / ( n - 1 );
        s2 = ( n - 1 ) / ( n - 2 ) * ( s2y - slope * slope * s2x );
        s2 = Math.abs( s2 );
        s = Math.sqrt( s2 );
        let t95 = [0, 6.314, 2.920, 2.353, 2.132, 2.015, 1.943, 1.895, 1.860, 1.833, 1.812];
        let xpred = 0;
        let ymean = slope * xpred + intercept;
        //let ylower = ymean - s*Math.sqrt(1 + 1/n + (xpred-xbar)*(xpred-xbar)/(n-1)/s2x);
        let ylower = ymean - t95[n - 2] * s * Math.sqrt( 1 + 1 / n + ( xpred - xbar ) * ( xpred - xbar ) / ( n - 1 ) / s2x );
        let yupper = 2 * ymean - ylower;
        xpred = n - 1;
        let ymean2 = slope * xpred + intercept;
        //let ylower2 = ymean2 - s*Math.sqrt(1 + 1/n + (xpred-xbar)*(xpred-xbar)/(n-1)/s2x);
        let ylower2 = ymean2 - t95[n - 2] * s * Math.sqrt( 1 + 1 / n + ( xpred - xbar ) * ( xpred - xbar ) / ( n - 1 ) / s2x );
        let yupper2 = 2 * ymean2 - ylower2;
        let yupper3 = yupper, yupper4 = yupper2;
        let ylower3 = ylower, ylower4 = ylower2;
        yupper = ( ymean + yupper ) * 0.5;
        ylower = ( ymean + ylower ) * 0.5;
        yupper2 = ( ymean2 + yupper2 ) * 0.5;
        ylower2 = ( ymean2 + ylower2 ) * 0.5;
        let gain = ymean2 / ymean;
        //let ylower = ymean - t95[n-2]*s*sqrt(1 + 1/n + (xpred-xbar)*(xpred-xbar)/(n-1)/s2x);
        //let delta = ymean2 - ymean;
        return { slope, intercept, r, r2, yupper, ymean, ylower, yupper2, ymean2, ylower2, yupper3, ylower3, yupper4, ylower4, gain };
    }

    draw_lines( lines, styles = {}, className = 'lines' ) {
        for ( let line of lines ) {
            let element = document.createElementNS( this.namespace, 'path' ), path = '';
            element.setAttributeNS( null, 'class', className );
            for ( let i = 0; i < line.length; i += 2 ) {
                let x = line[i], y = line[i + 1];
                path += `${i > 0 ? 'L' : 'M'}${this.nz( this.dx( x ) )},${this.nz( this.dy( y ) )}`;
            }
            element.setAttributeNS( null, 'd', path );
            this.svg.appendChild( element );
        }
    }

    draw_hlines( hlines, y_axis_precision = 8, styles = {}, className = 'hlines' ) {
        let tooltip_class = typeof tippy == 'undefined' ? 'title' : 'data-tippy-content';
        for ( let line of hlines ) {
            let [side, price, annotation, color] = line;
            let element = document.createElementNS( this.namespace, 'path' );
            element.setAttributeNS( null, 'class', `tip ${className} ${color}` );
            let autofmt = this.autoformat( price, y_axis_precision, y_axis_precision );
            let dy = this.nz( this.dy( Number( price ) ) );
            const tooltip = annotation ? `${side} ${annotation} @ ${autofmt}` : `${side} ${autofmt}`;
            //const inner_width = this.width - ( this.margin_right * 0.275 );
            element.setAttributeNS( null, 'd', `M${this.nz( this.dx( 0 ) )},${dy}L${this.nz( this.dx( this.width ) )},${dy}` );
            element.setAttributeNS( null, tooltip_class, tooltip );
            this.svg.appendChild( element );
            //annotation = `${autofmt} ${annotation}`;
            if ( annotation ) this.svg.appendChild( this.text( 1, dy, annotation, color, "start", "middle", "10px" ) );
            //if ( annotation ) this.svg.appendChild( this.text( 1, dy, annotation, `hover thin ${color}`, "start", "middle" ) );
            //if ( annotation ) this.svg.appendChild( this.text( this.width, dy, annotation, `margin ${color}`, "end", "middle" ) );
        }
    }

    draw_regression( length = this.regression ) {
        if ( length == true ) length = 10;
        let linreg = this.regress( false, this.closes.slice( -length ) );
        let xstart = this.count - length, xend = this.count;
        let lines = [
            [xstart, linreg.yupper3, xend, linreg.yupper4],
            //[xstart, linreg.yupper, xend, linreg.yupper2],
            //[xstart, linreg.ylower, xend, linreg.ylower2],
            [xstart, linreg.ylower3, xend, linreg.ylower4]
        ];
        this.draw_lines( lines, {}, 'regression' );
        //let bullish = ( linreg.gain >= 0.88 ) ? true : false;
    }

    custom_structure( tick ) {
        const today = moment(), alignment = 'middle', svg = this.svg;
        //daily open 'day'
        const week_open = today.startOf( 'week' );
        const month_open = today.startOf( 'month' ), month_cal = month_open.calendar();
        const quarter_open = today.startOf( 'quarter' ), quarter_cal = quarter_open.calendar();
        const year_open = today.startOf( 'year' ), year_cal = year_open.calendar();
        if ( month_cal == year_cal ) this.drawn.month_open = true;
        if ( quarter_cal == year_cal ) this.drawn.quarter_open = true;
        //if ( week_cal == year_cal || typeof this.drawn. ) this.drawn.week_open = true;
        let tooltip_class = typeof tippy == 'undefined' ? 'title' : 'data-tippy-content';
        let d = moment( tick.time ), cal = d.calendar(), last_close = this.last_tick.c
        let color = this.last_tick.c >= tick.o ? 'green' : 'red';
        let size = ( this.width / this.zoomdata.length ) - 5;
        if ( size < 5 ) size = 5;
        if ( size > 20 ) size = 20;
        // Yearly Open
        if ( year_cal == cal && typeof this.drawn.year_open == 'undefined' ) { // year_open.isSame( d, 'd' )
            let element = document.createElementNS( this.namespace, 'path' );
            element.setAttributeNS( null, 'class', 'structure tip' );
            element.setAttributeNS( null, 'd', `M${this.dx( tick.x )},${this.dy( tick.o )}L${this.dx( this.width )},${this.dy( tick.o )}` );
            element.setAttributeNS( null, tooltip_class, this.autoformat( tick.o ) );
            element.setAttributeNS( null, 'stroke-dasharray', '4' );
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
            element.setAttributeNS( null, 'stroke-dasharray', '4' );
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
            element.setAttributeNS( null, 'stroke-dasharray', '4' );
            this.drawn.month_open = tick.o;
            svg.appendChild( element );
            let textelement = this.text( this.width, this.dy( tick.o ) + 1, 'Monthly Open', 'structure ' + color, 'end', alignment, size );
            textelement.setAttributeNS( null, tooltip_class, this.autoformat( tick.o ) );
            svg.appendChild( textelement );
        }
        // Weekly Open
        /*if ( week_open.isSame( d, 'day' ) && typeof this.drawn.week_open == 'undefined' ) {
            let element = document.createElementNS( this.namespace, 'path' );
            element.setAttributeNS( null, 'class', 'structure tip' );
            element.setAttributeNS( null, 'd', `M${this.dx( tick.x )},${this.dy( tick.o )}L${this.dx( this.width )},${this.dy( tick.o )}` );
            element.setAttributeNS( null, tooltip_class, this.autoformat( tick.o ) );
            this.drawn.week_open = tick.o;
            if ( !this.gridlines ) svg.appendChild( element );
            let textelement = this.text( this.width, this.dy( tick.o ) + 1, 'Weekly Open', 'structure ' + color, 'end', alignment, size );
            textelement.setAttributeNS( null, tooltip_class, this.autoformat( tick.o ) );
            this.svg.appendChild( textelement );
        }*/
    }

    draw_grid() {
        let y_axis_precision = this.getPrecision( Math.max( ...this.ticks_y.map( d => this.autoformat( d ) ) ) );
        //console.info( this.autoformat( this.ticks_y[0], y_axis_precision, y_axis_precision ), y_axis_precision );
        // Remove y axis duplicates
        const compare = ( a,b ) => ( a == b ) || ( Math.abs( a.length - b.length ) > 2 );
        while ( y_axis_precision < 8 && compare( this.autoformat( this.ticks_y[0], y_axis_precision, y_axis_precision ), this.autoformat( this.ticks_y[1], y_axis_precision, y_axis_precision ) ) ) {
            ++y_axis_precision;
        }
        let last_close = this.last_tick.c, close_display = this.autoformat( last_close, y_axis_precision, y_axis_precision ), close_precision = this.getPrecision( close_display );
        if ( y_axis_precision < close_precision ) y_axis_precision = close_precision;
        // Remove y axis beneath last price
        //let closest = this.get_closest( this.ticks_y, last_close );
        if ( close_display.length < 6 ) this.margin_right = 50;
        else if ( close_display.length < 8 ) this.margin_right = 75;
        
        this.margin_x = this.width - this.margin_right;
        this.margin_y = this.height - this.margin_bottom;
        for ( let x of this.ticks_x ) {
            let dx = this.timex( x );
            //console.log( x, dx );
            let element = document.createElementNS( this.namespace, 'path' );
            element.setAttributeNS( null, 'class', 'grid' );
            element.setAttributeNS( null, 'd', `M${dx},0L${dx},${this.height - this.margin_bottom}` );
            if ( this.gridlines ) this.svg.appendChild( element );
            this.svg.appendChild( this.text( dx, this.height - 2, moment( x ).format( 'MMM D' ), 'xaxis', 'middle', 'start' ) );
        }
        //let tick_distance = ( this.ticks_y[1] - this.ticks_y[0] ) / 3;
        for ( let y of this.ticks_y ) {
            let element = document.createElementNS( this.namespace, 'path' );
            element.setAttributeNS( null, 'class', 'grid' );
            element.setAttributeNS( null, 'd', `M0,${this.dy( y )}L${this.width - ( this.margin_right * 0.275 )},${this.dy( y )}` );
            if ( this.gridlines ) this.svg.appendChild( element );
            //if ( y == closest && Math.abs( closest - last_close ) < tick_distance ) continue;
            let display = this.autoformat( y, y_axis_precision, y_axis_precision ).replace( '$', '' ).replace( /,/g, '' );
            this.svg.appendChild( this.text( this.width, this.dy( y ), display, 'axis', 'end', 'middle' ) );
        }
        for ( let tick of this.zoomdata ) {
            if ( this.show_volume && tick.v ) {
                let size = ( this.width / this.zoomdata.length ) - 3.5;
                //if ( this.zoomdata.length < 20 ) size = size * 2;
                if ( this.zoomdata.length < 10 ) size = size * 2;
                let rect = document.createElementNS( this.namespace, "rect" );
                let rect_height = 40 * ( tick.v / this.max_vol );
                rect.setAttributeNS( null, "x", this.dx( tick.x ) - 1 );
                rect.setAttributeNS( null, "y", this.height - ( rect_height + 20 ) );//this.dy( this.height ) - ( this.margin_y + 4 ) );
                rect.setAttributeNS( null, "width", size );
                rect.setAttributeNS( null, "height", rect_height );
                rect.setAttributeNS( null, "class", `${tick.c >= tick.o ? 'up' : 'down'} vol` );
                this.svg.appendChild( rect );
            }
        }
        let display_y = this.dy( last_close );
        let element = this.text( this.width, display_y < 10 ? 10 : display_y, close_display, 'lastprice', 'end', 'middle' );
        this.svg.appendChild( element );
        //console.log( element.getComputedTextLength() );
        //let bbox = element.getBBox()
        let rect = document.createElementNS( this.namespace, "rect" );
        let rect_height = 11.5, rect_padding = Math.ceil( rect_height / 3 );
        if ( display_y < rect_height - rect_padding ) display_y = rect_height - rect_padding;
        rect.setAttributeNS( null, "x", this.margin_x + 4 );
        rect.setAttributeNS( null, "y", display_y - rect_height );
        rect.setAttributeNS( null, "width", this.margin_x );
        rect.setAttributeNS( null, "height", 20 );
        rect.setAttributeNS( null, "fill", "#1c1e23" );
        //rect.setAttributeNS( null, "class", "up" );
        this.svg.insertBefore( rect, element );
        return y_axis_precision;
    }

    render( json = false ) {
        this.width = this.target.clientWidth;
        this.height = this.target.clientHeight;
        if ( !json ) json = this.data;
        let data = this.zoomdata = json.slice( this.zoom * -7 );
        if ( data.length < 2 ) return this.zoom = 0;
        this.wickpadding = this.width > 1500 ? 4 : this.width > 1000 ? 2 : 1;
        let maxticks_x = this.width > 1500 ? 14 : 7;
        let maxticks_y = this.height > 190 ? 10 : 5;
        //let maxwidth = this.width / ( data.length - 1 ) - this.wickpadding;
        let wickwidth = 0.6, halfwick = wickwidth / 2;
        if ( this.smoothing ) { // heikin ashi, etc
            /*console.info( data );
            data = this.ha( data );
            console.info( data );*/
        }
        //console.table( data );
        this.drawn = {};
        this.last_tick = data.slice( -1 )[0];
        this.min_y = Math.min( ...data.map( d => d.l ) );
        this.max_y = Math.max( ...data.map( d => d.h ) );
        if ( this.hlines && this.showAll ) {
            let ll = Math.min( ...this.hlines.map( d => Number( d[1] ) ) );
            let hh = Math.max( ...this.hlines.map( d => Number( d[1] ) ) );
            if ( ll < this.min_y ) this.min_y = ll;
            if ( hh > this.max_y ) this.max_y = hh;
        }
        this.min_x = Math.min( ...data.map( d => d.x ) );
        this.max_x = Math.max( ...data.map( d => d.x ) ) + 0.5;
        this.max_vol = Math.max( ...data.map( d => d.v ) );
        this.min_time = Math.min( ...data.map( d => d.time ) );
        this.max_time = Math.max( ...data.map( d => d.time ) );
        this.ticks_x = this.timeRange( this.min_time, this.max_time, maxticks_x );
        this.ticks_y = this.calculateTicks( this.min_y, this.max_y, maxticks_y );
        //ticks_x / 1e3 difference tells you the timeframe. 1d = 86400
        this.range_y = this.max_y - this.min_y;
        this.range_x = this.max_x - this.min_x;
        this.time_delta = data[1].time - data[0].time;
        //console.log( `time delta: ` + this.time_delta );
        this.time_range = this.max_time - this.min_time;
        //this.mid_x = ( this.min_x + this.min_y ) / 2;
        //this.mid_y = ( this.max_y + this.min_y ) / 2;
        //console.log( `delta: ${this.range_x}, ${this.range_y}` );
        //console.info( `min_x: ${this.min_x}, min_y: ${this.min_y}, max_x: ${this.max_x}, max_y: ${this.max_y}` );
        //let x_ticks = scaleTicks(TICK_COUNT, MAX_X, MIN_X);
        //let y_ticks = [MAX_Y, (MAX_Y + MIN_Y) / 2, MIN_Y];
        //let dateFormat = 'll'; // https://momentjs.com
        //let xticks = show_time ? quartileBounds(data.map(d => d.time)).map(v => `<div data-value='${moment(v).format(dateFormat)}'></div>`) : x_ticks.map(v => `<div data-value='${format(v, precision)}'></div>`);
        //let yticks = MAX_Y > 999 ? y_ticks.map(v => `<div data-value='${usd(v)}'></div>`) :  y_ticks.map(v => `<div data-value='${format(v, precision)}'></div>`);
        let svg = this.svg = document.createElementNS( this.namespace, "svg" ), color;
        //svg.style.strokeWidth = "1px";
        svg.style.width = `${this.width}px`;
        svg.style.height = `${this.height}px`;
        svg.setAttributeNS( null, 'class', `Chart ${this.theme} ${this.style}` );
        svg.setAttributeNS( null, 'width', this.width );
        svg.setAttributeNS( null, 'height', this.height );
        svg.setAttributeNS( null, 'shape-rendering', 'crispEdges' ); // Remove blur
        const tooltip_class = typeof tippy == 'undefined' ? 'title' : 'data-tippy-content';
        if ( this.hlines ) this.draw_hlines( this.hlines );
        let y_axis_precision = this.draw_grid();
        //if ( this.hlines ) this.draw_hlines( this.hlines, y_axis_precision ); //if ( this.hlines ) this.draw_hlines( this.hlines, y_axis_precision );
        for ( let tick of data ) {
            color = tick.c >= tick.o ? 'up' : 'down';
            if ( this.structure ) this.custom_structure( tick );
            let candle = document.createElementNS( this.namespace, 'path' );
            candle.setAttributeNS( null, 'class', `${color} tip` );
            let wick_highest = Math.max( tick.o, tick.c ), wick_lowest = Math.min( tick.o, tick.c );
            let wick_top = `M${this.dx( tick.x + halfwick )},${this.dy( tick.h )}L${this.dx( tick.x + halfwick )},${this.dy( wick_highest )}`;
            let wick_bot = `M${this.dx( tick.x + halfwick )},${this.dy( wick_lowest )}L${this.dx( tick.x + halfwick )},${this.dy( tick.l )}`;
            let candle_body = `M${this.dx( tick.x )},${this.dy( tick.o )}L${this.dx( tick.x + wickwidth )},${this.dy( tick.o )}L${this.dx( tick.x + wickwidth )},${this.dy( tick.c )}L${this.dx( tick.x )},${this.dy( tick.c )}Z`;
            candle.setAttributeNS( null, 'd', wick_top + candle_body + wick_bot );
            candle.setAttributeNS( null, tooltip_class, `<b>${moment( tick.time ).calendar()}</b><br/><b>Open:</b> ${tick.o}<br/><b>High:</b> ${tick.h}<br/><b>Low:</b> ${tick.l}<br/><b>Close:</b> ${tick.c}<br/>${tick.v > 0 ? `<b>Volume:</b> ${Math.round( tick.v ).toLocaleString()}` : ''}` );
            svg.appendChild( candle );
        }
        /////////////////////////////////////////////////
        if ( this.watermark ) {
            console.info( "loading watermark: " + this.watermark );
            let logo = document.createElementNS( this.namespace, 'image' );
            logo.setAttribute( 'width', '170' );
            logo.setAttribute( 'height', '28' );
            logo.setAttribute( 'x', 0 );
            logo.setAttribute( 'y', this.height - 28 );
            logo.setAttributeNS( 'http://www.w3.org/1999/xlink', 'href', this.watermark );
            logo.setAttribute( 'onclick', 'location.href = "https://chartaholic.com";' );
            svg.appendChild( logo );
        }
        if ( this.lines ) this.draw_lines( this.lines );
        if ( this.regression ) this.draw_regression();
        if ( this.title ) svg.appendChild( this.text( 0, 1, this.title, 'headline' ) );
        //onmousemove='debounce(mousemove(event),20)' onmouseout='mouseout()'
        //<text id='mousex' dominant-baseline='hanging' x='0' y='0'></text>
        //<text id='mousey' dominant-baseline='baseline' x='0' y='${HEIGHT}'></text>
        this.target.innerHTML = "";
        this.target.appendChild( svg );
        if ( typeof tippy !== "undefined" ) tippy( ".tip", { theme: "light", arrow: true, a11y: false } );
        /////////////////////////////////////////////////
    }

    scaleTicks( count, max, min ) {
        return [...Array( count ).keys()].map( d => max / ( count - 1 ) * parseInt( d ) )
    }
    nz( value, def = 0 ) {
        return isFinite( value ) ? value : def;
    }
    // Display sats values instead of small fractions
    sats( number, maxdigits = 8, mindigits = 1 ) {
        if ( number <= 0.0001 ) return Math.round( number * 1e8 ).toString();// + " sats";
        return new Intl.NumberFormat( 'en-US', { style: 'decimal', minimumFractionDigits: mindigits, maximumFractionDigits: maxdigits } ).format( number );
    }
    // Format display for USD currency
    usd( number, maxPrecision = 2, minPrecision = 0 ) {
        if ( maxPrecision < 1 ) maxPrecision = 8;
        let result = Intl.NumberFormat( 'en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: minPrecision, maximumFractionDigits: maxPrecision } ).format( number );
        if ( minPrecision == 0 ) return result.replace( /\.00$/, '' );
        return result;
    }
    // Format decimal precision
    format( number, maxPrecision = 8, minPrecision = 0 ) {
        if ( maxPrecision < 1 ) maxPrecision = 8;
        return new Intl.NumberFormat( 'en-US', { style: 'decimal', minimumFractionDigits: minPrecision, maximumFractionDigits: maxPrecision } ).format( number );
    }
    // Automatically determine formatting
    autoformat( number, maxPrecision = 8, minPrecision = 0 ) {
        //if ( number <= 0.00001 ) return this.format( number, 8, 8 );
        if ( number <= 0.0001 && this.use_sats ) return this.sats( number, maxPrecision, minPrecision );//this.format( number, 8, 2 )
        if ( number < 0.01 ) return this.format( number, maxPrecision, minPrecision ) //minPrecision < 3 ? 3 : minPrecision
        if ( number < 0.1 ) return this.format( number, maxPrecision, minPrecision ) //minPrecision < 2 ? 2 : 
        if ( number >= 1000 ) return this.usd( number, maxPrecision < 2 ? 2 : maxPrecision, minPrecision );
        if ( number >= 100 ) return this.usd( number, maxPrecision < 4 ? 4 : maxPrecision, minPrecision );
        if ( number >= 10 ) return this.usd( number, maxPrecision < 4 ? 4 : maxPrecision, minPrecision );
        if ( number < 10 ) return this.format( number, maxPrecision, minPrecision )
        return this.format( number, maxPrecision, minPrecision );
    }

    constructor( target, options = {} ) {
        this.namespace = "http://www.w3.org/2000/svg";
        this.target = typeof target == "string" ? document.querySelector( target ) : target;
        this.theme = typeof options.theme == "undefined" ? "standard" : options.theme;
        this.style = this.theme == "light" || this.theme == "contrast" ? "light" : "dark";
        this.title = typeof options.title == "undefined" ? "" : options.title;
        this.keys = typeof options.keys == "undefined" ? {} : options.keys;
        this.showAll = typeof options.showAll == "undefined" ? true : options.showAll;
        this.enableZoom = typeof options.enableZoom == "undefined" ? true : options.enableZoom;
        //indicator color overlay: filter: brightness(0.5) sepia(1) hue-rotate(65deg) saturate(5);
        this.indicators = typeof options.indicators == "undefined" ? [] : options.indicators;
        this.regression = typeof options.regression == "undefined" ? false : options.regression;
        this.structure = typeof options.structure == "undefined" ? false : options.structure;
        this.smoothing = typeof options.smoothing == "undefined" ? false : options.smoothing;
        this.gridlines = typeof options.gridlines == "undefined" ? true : options.gridlines;
        //this.analysis = typeof options.analysis == "undefined" ? false : options.analysis;
        this.margin_right = typeof options.margin_right == "undefined" ? 100 : options.margin_right;
        this.show_volume = typeof options.show_volume == "undefined" ? false : options.show_volume;
        this.margin_bottom = typeof options.margin_bottom == "undefined" ? this.show_volume ? 30 : 13 : options.margin_bottom;
        //this.styles = typeof options.styles == "undefined" ? {lines:{}} : options.styles;
        this.lines = typeof options.lines == "undefined" ? [] : options.lines;
        this.hlines = typeof options.hlines == "undefined" ? [] : options.hlines;
        this.use_sats = typeof options.use_sats == "undefined" ? true : options.use_sats;
        this.watermark = typeof options.watermark == "undefined" ? "" : options.watermark;
        this.reset();
        if ( !this.target ) throw `Invalid target: ${target}`;
        window.addEventListener( 'resize', this.resize.bind( this ) );
        if ( this.enableZoom ) this.target.addEventListener( 'wheel', this.scroll.bind( this ) );
        this.zoom = typeof options.zoom == "undefined" ? 0 : options.zoom;
        if ( typeof options.ticks !== "undefined" ) this.import( options.ticks, true );
        if ( this.zoom !== 0 ) this.render();
        setTimeout( () => { this.render(); }, 50, this );
    }
}
if ( typeof module !== 'undefined' && module.exports ) module.exports = Chartaholic;
