class Chartaholic {
    reset() {
        this.zoom = 0;
        this.fullscrolling = false;
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
    append( tick, draw = false ) {
        let time = new Date( tick[this.keys.time] ).getTime();
        let close = Number( tick[this.keys.close] );
        if ( this.type == 'line' ) {
            this.closes.push( close );
            this.data.push( {
                x: this.count++,
                c: close,
                time
            } );
            if ( draw ) this.render();
            return;
        }
        let open = Number( tick[this.keys.open] );
        let high = Number( tick[this.keys.high] );
        let low = Number( tick[this.keys.low] );
        let volume = typeof tick[this.keys.volume] == "undefined" ? 0 : Number( tick[this.keys.volume] );
        let color = typeof tick[this.keys.color] !== 'undefined' ? tick[this.keys.color] : null;
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
            time,
            color
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
        const keys = this.type == 'line' ? ['close', 'time'] : ['open', 'high', 'low', 'close', 'volume', 'time'];
        for ( let key of keys ) {
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
        if ( this.enableZoom == "shift" && !event.shiftKey ) return;
        if ( typeof tippy !== "undefined" ) {
            let elements = document.querySelectorAll( ".tippy-popper" );
            for ( let element of elements ) {
                element.outerHTML = "";
            }
        }
        if ( event.altKey ) {
            this.fullscrolling = true;
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
        //return -1 * Math.log10(0.0000001)
        if ( !float || Number.isInteger( float ) ) return 0;
        let digits = float.toString().split( '.' )[1];
        if ( this.precision ) {
            if ( digits && digits.length && digits.length > this.precision[1] ) return this.precision[1];
            else return this.precision[0];
        }
        return !digits || typeof digits.length == "undefined" || isNaN( digits.length ) ? 0 : digits.length;
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

    text( x, y, textContent, params = {} ) {
        if ( isNaN( y ) || isNaN( x ) ) return console.warn( `NaN: text(${ x }, ${ y }, ${ textContent }, ${ JSON.stringify( params ) })` );
        let className = typeof params.className !== "undefined" ? params.className : "";
        let anchor = typeof params.anchor !== "undefined" ? params.anchor : "start";
        let alignment = typeof params.alignment !== "undefined" ? params.alignment : "hanging";
        let fontSize = typeof params.fontSize !== "undefined" ? params.fontSize : false;
        let fill = typeof params.fill !== "undefined" ? params.fill : false;
        let element = document.createElementNS( this.namespace, "text" );
        if ( fontSize ) element.style.fontSize = `${ fontSize }px`;
        if ( fill ) element.setAttributeNS( null, "fill", fill );
        element.setAttributeNS( null, "class", className );
        element.setAttributeNS( null, "text-anchor", anchor );
        element.setAttributeNS( null, "dominant-baseline", alignment );
        element.setAttributeNS( null, "x", x );
        element.setAttributeNS( null, "y", y );
        element.textContent = textContent;
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
                path += `${ i > 0 ? 'L' : 'M' }${ this.nz( this.dx( x ) ) },${ this.nz( this.dy( y ) ) }`;
            }
            element.setAttributeNS( null, 'd', path );
            this.svg.appendChild( element );
        }
    }

    setMinMaxY() {
        if ( this.overlay && this.showAll ) {
            for ( let line of this.overlay ) {
                let indicatorData = line[1];
                if ( Array.isArray( indicatorData ) ) { // Array, use each value
                    let ll = Math.min( ...indicatorData ), hh = Math.max( ...indicatorData );
                    if ( ll < this.min_y ) this.min_y = ll;
                    if ( hh > this.max_y ) this.max_y = hh;
                } else {
                    // OHLC
                }
            }
        }

        if ( this.hlines && this.showAll ) {
            const hlinesMap = this.hlines.map( d => Number( d[1] ) );
            let ll = Math.min( ...hlinesMap ), hh = Math.max( ...hlinesMap );
            if ( ll < this.min_y ) this.min_y = ll;
            if ( hh > this.max_y ) this.max_y = hh;
        }
    }

    draw_hlines( hlines, y_axis_precision = 8, styles = {}, className = 'hlines' ) {
        let tooltipClass = typeof tippy == 'undefined' ? 'title' : 'data-tippy-content';
        for ( let line of hlines ) {
            let [side, price, annotation, color] = line;
            let element = document.createElementNS( this.namespace, 'path' );
            element.setAttributeNS( null, 'class', `tip ${ className } ${ color }` );
            let autofmt = this.autoformat( price, y_axis_precision, y_axis_precision );
            let dy = this.nz( this.dy( Number( price ) ) );
            const tooltip = annotation ? `${ side } ${ annotation } @ ${ autofmt }` : `${ side } ${ autofmt }`;
            //const inner_width = this.width - ( this.margin_right * 0.275 );
            element.setAttributeNS( null, 'd', `M${ this.nz( this.dx( 0 ) ) },${ dy }L${ this.nz( this.dx( this.width ) ) },${ dy }` );
            element.setAttributeNS( null, tooltipClass, tooltip );
            this.svg.appendChild( element );
            //annotation = `${autofmt} ${annotation}`;
            if ( annotation ) this.svg.appendChild( this.text( 1, dy, annotation, { className: color, anchor: "start", alignment: "middle", fontSize: "10px" } ) );
            //if ( annotation ) this.svg.appendChild( this.text( 1, dy, annotation, {className:`hover thin ${color}`, anchor:"start", alignment:"middle" } ) );
            //if ( annotation ) this.svg.appendChild( this.text( this.width, dy, annotation, {className:`margin ${color}`, anchor:"end", alignment:"middle" } ) );
        }
    }

    draw_regression( length = this.regression ) {
        if ( length === true || isNaN( length ) ) length = 10;
        let series = this.closes.slice( parseInt( length ) * -1 );
        let linreg = this.regress( false, series );
        console.info( 'linreg', linreg );
        let xstart = this.count - length, xend = this.count;
        let lines = [
            [xstart, linreg.yupper3, xend, linreg.yupper4],
            //[xstart, linreg.yupper, xend, linreg.yupper2],
            //[xstart, linreg.ylower, xend, linreg.ylower2],
            [xstart, linreg.ylower3, xend, linreg.ylower4]
        ];
        console.info( 'regression', lines );
        this.draw_lines( lines, {}, 'regression' );
        //let bullish = ( linreg.gain >= 0.88 ) ? true : false;
    }

    drawAxisText( y_axis_precision ) {
        let satsDisplay = this.satsDisplay && this.max_y <= 0.0001 && this.yAxisPrecision <= 5;
        let last_close = this.last_tick.c;
        let xdupes = [], months = [];
        const day = 86400 * 1e3, minute = 60 * 1e3;
        for ( let x of this.ticks_x ) {
            let dx = this.timex( x );
            //console.log( x, dx );
            let month = dateFns.format( x, 'MMM' );
            let xdisplay = dateFns.format( x, 'D' ); // 6
            let xdate = `${ month } ${ xdisplay }`;
            if ( !months.includes( month ) ) {
                months.push( month );
                xdisplay = xdate;
            }
            //console.log( `time delta: ` + this.time_delta );
            //ticks_x / 1e3 difference tells you the timeframe. 1d = 86400
            // Need to round the tick placement for inconsistent data sets: 15:00 instead of 15:37
            /*if ( this.time_delta <= minute ) {
                xdisplay = dateFns.format( x, 'HH:mm:ss' ); // 17:30:00
            } else if ( this.time_delta <= day ) {
                xdisplay = dateFns.format( x, 'HH:mm' ); // 03:30
            } else xdupes.push( xdate );*/
            if ( xdupes.includes( xdate ) ) {
                let rounded = this.roundMinutes( dateFns.format( x, 'mm' ) );
                xdisplay = xdisplay = dateFns.format( x, `h:${ rounded }a` );
            } else xdupes.push( xdate );
            this.svg.appendChild( this.text( dx, this.height - 2, xdisplay, { className: 'xaxis', anchor: 'middle', alignment: 'start' } ) );
        }
        //let tick_distance = ( this.ticks_y[1] - this.ticks_y[0] ) / 3;
        for ( let y of this.ticks_y ) {
            //if ( y == closest && Math.abs( closest - last_close ) < tick_distance ) continue;
            let display = this.autoformat( y, y_axis_precision, y_axis_precision, satsDisplay ).replace( '$', '' );
            if ( !this.yAxisCommas ) display = display.replace( /,/g, '' );
            this.svg.appendChild( this.text( this.width, this.dy( y ), display, { className: 'axis', anchor: 'end', alignment: 'middle' } ) );
        }
        let display_y = this.nz( this.dy( last_close ) );
        if ( this.usd && !this.close_display.startsWith( '$' ) ) this.close_display = `$${ this.close_display }`;
        let element = this.text( this.width, display_y < 10 ? 10 : display_y, this.close_display, { className: 'lastprice', anchor: 'end', alignment: 'middle' } );
        if ( !element ) return;
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
    }

    drawGridLines() {
        if ( !this.gridlines ) return false;
        for ( let x of this.ticks_x ) {
            let dx = this.timex( x );
            let element = document.createElementNS( this.namespace, 'path' );
            element.setAttributeNS( null, 'class', 'grid' );
            element.setAttributeNS( null, 'd', `M${ dx },0L${ dx },${ this.height - this.margin_bottom }` );
            this.svg.appendChild( element );
        }
        for ( let y of this.ticks_y ) {
            let element = document.createElementNS( this.namespace, 'path' );
            element.setAttributeNS( null, 'class', 'grid' );
            element.setAttributeNS( null, 'd', `M0,${ this.dy( y ) }L${ this.width - ( this.margin_right * 0.275 ) },${ this.dy( y ) }` );
            this.svg.appendChild( element );
        }
    }

    drawGrid() {
        let last_close = this.last_tick.c, close_precision = this.getPrecision( this.autoformat( last_close ) );
        let y_axis_precision = Math.max( ...this.ticks_y.map( d => this.autoformat( d ) ) );
        if ( y_axis_precision < close_precision ) y_axis_precision = close_precision;
        if ( y_axis_precision < this.yAxisPrecision ) y_axis_precision = this.yAxisPrecision;
        let satsDisplay = this.satsDisplay && this.max_y <= 0.0001 && this.yAxisPrecision <= 5;
        if ( this.usd ) {
            if ( this.min_y > 0.01 ) y_axis_precision = 2;
            else if ( this.min_y >= 0.001 ) y_axis_precision = 3;
            else if ( this.min_y >= 0.0001 ) y_axis_precision = 4;
            else if ( this.min_y >= 0.00001 ) y_axis_precision = 5;
        }
        const compare = ( a, b ) => ( a == b ) || ( Math.abs( a.length - b.length ) > 2 ), axis = ( precision, index ) => this.autoformat( this.ticks_y[index], precision, precision )
        const check_duplicates = precision => compare( axis( precision, 0 ), axis( precision, 1 ) ) || compare( axis( precision, 1 ), axis( precision, 2 ) )
        while ( y_axis_precision < 8 && check_duplicates( y_axis_precision ) ) {
            ++y_axis_precision;
        }
        if ( this.precision ) {
            if ( y_axis_precision < this.precision[0] ) y_axis_precision = this.precision[0];
            if ( y_axis_precision > this.precision[1] ) y_axis_precision = this.precision[1];
        }
        this.close_display = this.autoformat( last_close, y_axis_precision, y_axis_precision, satsDisplay, false );
        if ( !this.usd ) {
            close_precision = this.getPrecision( this.close_display );
            if ( y_axis_precision < close_precision - 1 ) y_axis_precision = close_precision;
        }
        // Remove y axis beneath last price
        //let closest = this.get_closest( this.ticks_y, last_close );
        if ( this.close_display.length < 6 ) this.margin_right = 50;
        else if ( this.close_display.length < 8 ) this.margin_right = 75;
        this.margin_x = this.width - this.margin_right;
        this.margin_y = this.height - this.margin_bottom;
        this.drawGridLines();
        for ( let tick of this.zoomdata ) {
            if ( this.show_volume && tick.v ) {
                let size = ( this.width / this.zoomdata.length ) - 3.5;
                if ( this.zoomdata.length < 10 ) size = size * 2;
                let rect = document.createElementNS( this.namespace, "rect" );
                let rect_height = 40 * ( tick.v / this.max_vol );
                rect.setAttributeNS( null, "x", this.dx( tick.x ) - 1 );
                rect.setAttributeNS( null, "y", this.height - ( rect_height + 20 ) );//this.dy( this.height ) - ( this.margin_y + 4 ) );
                rect.setAttributeNS( null, "width", size );
                rect.setAttributeNS( null, "height", rect_height );
                rect.setAttributeNS( null, "class", `${ tick.c >= tick.o ? 'up' : 'down' } vol` );
                this.svg.appendChild( rect );
            }
        }
        return y_axis_precision;
    }

    render( json = false ) {
        if ( !this.target || ( !json && !this.data ) ) return;
        this.width = this.target.clientWidth;
        this.height = this.target.clientHeight;
        this.wickpadding = this.width > 1500 ? 4 : this.width > 1000 ? 2 : 1;
        let maxticks_x = this.width > 1500 ? 14 : 7;
        let maxticks_y = this.height > 190 ? 10 : 5;
        if ( !json ) json = this.data;
        let data;
        if ( this.fullscrolling ) {
            data = this.zoomdata = json.slice( this.zoom * -7, ( this.zoom * -7 ) + this.zoomdata.length );
        } else {
            data = this.zoomdata = json.slice( this.zoom * -7 );
        }
        if ( data.length < 2 ) return this.zoom = 0;
        if ( this.smoothing ) { // heikin ashi, etc
            /*console.info( data );
            data = this.ha( data );
            console.info( data );*/
        }
        //console.table( data );
        let svg = this.svg = document.createElementNS( this.namespace, "svg" ), color;
        svg.style.width = `${ this.width }px`;
        svg.style.height = `${ this.height }px`;
        svg.setAttributeNS( null, 'class', `Chart ${ this.type } ${ this.theme } ${ this.style }` );
        svg.setAttributeNS( null, 'width', this.width );
        svg.setAttributeNS( null, 'height', this.height );
        svg.setAttributeNS( null, 'shape-rendering', 'crispEdges' ); // Remove blur
        const tooltipClass = typeof tippy == 'undefined' ? 'title' : 'data-tippy-content';
        this.drawn = {};
        this.last_tick = data.slice( -1 )[0];
        const xMap = data.map( d => d.x ), timeMap = data.map( d => d.time );
        this.min_x = Math.min( ...xMap );
        this.max_x = Math.max( ...xMap ) + 0.5;
        this.min_time = Math.min( ...timeMap );
        this.max_time = Math.max( ...timeMap );
        this.ticks_x = this.timeRange( this.min_time, this.max_time, maxticks_x );
        this.ticks_y = this.calculateTicks( this.min_y, this.max_y, maxticks_y );
        this.range_y = this.max_y - this.min_y;
        this.range_x = this.max_x - this.min_x;
        this.time_delta = data[1].time - data[0].time;
        this.time_range = this.max_time - this.min_time;

        if ( this.type == 'ohlcv' ) {
            let wickwidth = 0.6, halfwick = wickwidth / 2;
            this.max_vol = Math.max( ...data.map( d => d.v ) );
            this.min_y = Math.min( ...data.map( d => d.l ) );
            this.max_y = Math.max( ...data.map( d => d.h ) );
            this.setMinMaxY();
            //this.mid_x = ( this.min_x + this.min_y ) / 2;
            //this.mid_y = ( this.max_y + this.min_y ) / 2;
            //console.log( `delta: ${this.range_x}, ${this.range_y}` );
            //console.info( `min_x: ${this.min_x}, min_y: ${this.min_y}, max_x: ${this.max_x}, max_y: ${this.max_y}` );
            //let x_ticks = scaleTicks(TICK_COUNT, MAX_X, MIN_X);
            //let y_ticks = [MAX_Y, (MAX_Y + MIN_Y) / 2, MIN_Y];
            //let xticks = show_time ? quartileBounds(data.map(d => d.time)).map(v => `<div data-value='${dateFns.format(v, dateFormat)}'></div>`) : x_ticks.map(v => `<div data-value='${format(v, precision)}'></div>`);
            //let yticks = MAX_Y > 999 ? y_ticks.map(v => `<div data-value='${format_usd(v)}'></div>`) :  y_ticks.map(v => `<div data-value='${format(v, precision)}'></div>`);

            let y_axis_precision = this.drawGrid();
            //if ( this.hlines ) this.draw_hlines( this.hlines, y_axis_precision ); //if ( this.hlines ) this.draw_hlines( this.hlines, y_axis_precision );
            if ( this.hlines ) this.draw_hlines( this.hlines );
            this.drawAxisText( y_axis_precision );
            if ( this.overlay ) {
                let firstx = data[0].x;
                for ( let line of this.overlay ) {
                    if ( !line[1] || !line[1].length ) continue;
                    // let indicatorData = line[1], delta = data.length - (indicatorData.length + 1);
                    let indicatorData = line[1];
                    let delta;
                    if ( this.fullscrolling ) {
                        delta = ( json.length - indicatorData.length - firstx - 1 );
                    } else {
                        delta = data.length - ( indicatorData.length + 1 );
                    }
                    // console.info( `Overlay: indicatorData.length: ${ indicatorData.length }  delta old: ${ data.length - ( indicatorData.length + 1 ) } delta: ${ delta } firstx: ${ firstx } data.length: ${ data.length }` );
                    let poly = document.createElementNS( this.namespace, 'polyline' ), polydata = '';
                    poly.setAttributeNS( null, 'class', 'overlay' );
                    poly.setAttributeNS( null, 'fill', 'none' );
                    poly.setAttributeNS( null, 'stroke-linejoin', 'round' );
                    poly.setAttributeNS( null, 'stroke', typeof line[2] !== "undefined" ? line[2] : '#E91E63' ); // todo: material A200 accent array
                    poly.setAttributeNS( null, 'stroke-width', typeof line[3] !== "undefined" ? line[3] : '1' );
                    poly.setAttributeNS( null, 'stroke-dasharray', typeof line[4] !== "undefined" ? line[4] : '1' );
                    for ( let i in indicatorData ) {
                        let v = indicatorData[i];
                        polydata += `${ this.nz( this.dx( firstx + delta++ ) ) },${ this.nz( this.dy( v ) ) } `;
                    }
                    poly.setAttributeNS( null, 'points', polydata );
                    svg.appendChild( poly );
                }
            }
            this.fullscrolling = false;
            for ( let tick of data ) {
                color = tick.c >= tick.o ? 'up' : 'down';
                let candle = document.createElementNS( this.namespace, 'path' );
                if ( tick.color ) {
                    candle.setAttributeNS( null, 'class', 'tip' );
                    candle.style = `fill:${ tick.color };stroke:${ tick.color }`;
                } else candle.setAttributeNS( null, 'class', `${ color } tip` );
                let wick_highest = Math.max( tick.o, tick.c ), wick_lowest = Math.min( tick.o, tick.c );
                let wick_top = `M${ this.nz( this.dx( tick.x + halfwick ) ) },${ this.nz( this.dy( tick.h ) ) }L${ this.nz( this.dx( tick.x + halfwick ) ) },${ this.nz( this.dy( wick_highest ) ) }`;
                let wick_bot = `M${ this.nz( this.dx( tick.x + halfwick ) ) },${ this.nz( this.dy( wick_lowest ) ) }L${ this.nz( this.dx( tick.x + halfwick ) ) },${ this.nz( this.dy( tick.l ) ) }`;
                let candle_body = `M${ this.nz( this.dx( tick.x ) ) },${ this.nz( this.dy( tick.o ) ) }L${ this.nz( this.dx( tick.x + wickwidth ) ) },${ this.nz( this.dy( tick.o ) ) }L${ this.nz( this.dx( tick.x + wickwidth ) ) },${ this.nz( this.dy( tick.c ) ) }L${ this.nz( this.dx( tick.x ) ) },${ this.nz( this.dy( tick.c ) ) }Z`;
                candle.setAttributeNS( null, 'd', wick_top + candle_body + wick_bot );
                candle.setAttributeNS( null, tooltipClass, `<b>${ dateFns.distanceInWords( tick.time, new Date() ) }</b><br/><b>Open:</b> ${ tick.o }<br/><b>High:</b> ${ tick.h }<br/><b>Low:</b> ${ tick.l }<br/><b>Close:</b> ${ tick.c }<br/>${ tick.v > 0 ? `<b>Volume:</b> ${ Math.round( tick.v ).toLocaleString() }` : '' }` );
                svg.appendChild( candle );
            }
        } else if ( this.type == 'line' ) {
            if ( !isNaN( data[0].c ) ) {
                const series = data.map( d => d.c );
                this.min_y = Math.min( ...series );
                this.max_y = Math.max( ...series );
                this.setMinMaxY();
                let y_axis_precision = this.drawGrid();
                if ( this.hlines ) this.draw_hlines( this.hlines );
                this.drawAxisText( y_axis_precision );
                let polyline = document.createElementNS( this.namespace, 'polyline' );
                polyline.setAttributeNS( null, 'class', 'line' );
                polyline.setAttributeNS( null, 'points', data.map( d => `${ this.dx( d.x ) },${ this.nz( this.dy( d.c ) ) }` ).join( ' ' ) );
                svg.appendChild( polyline );
            }
        }
        /////////////////////////////////////////////////
        if ( this.watermark ) {
            let logo = document.createElementNS( this.namespace, 'image' );
            logo.setAttribute( 'width', this.watermark.width );
            logo.setAttribute( 'height', this.watermark.height );
            logo.setAttribute( 'x', typeof this.watermark.x == "undefined" ? 0 : this.watermark.x );
            logo.setAttribute( 'y', typeof this.watermark.y == "undefined" ? this.height - this.watermark.height : this.watermark.y );
            let onclick = typeof this.watermark.onclick !== "undefined" ? this.watermark.onclick : `location.href = "${ typeof this.watermark.link !== 'undefined' ? this.watermark.link : 'https://liquidity.ltd' }";`;
            logo.setAttribute( 'onclick', onclick );
            logo.setAttributeNS( 'http://www.w3.org/1999/xlink', 'href', this.watermark.src );
            svg.appendChild( logo );
        }
        if ( this.lines ) this.draw_lines( this.lines );
        if ( this.regression && this.regression != 'false' ) this.draw_regression();
        const offsetWidth = 20; // Speech bubble path height
        /*for ( let obj of this.annotations ) {
            if ( typeof obj.className == "undefined" ) obj.className = "";
            let group = document.createElementNS( this.namespace, 'g' ), green = obj.className.includes( 'green' ), offsetHeight = green ? 20 : -20;
            group.setAttributeNS( null, 'class', 'note' );
            group.setAttributeNS( null, 'transform', `translate(${ this.dx( obj.x ) - offsetWidth },${ this.dy( obj.y ) - offsetHeight })` );
            let pathData = "M 3.5 0.5 L 35.5 0.5 C 38.5 0.5 38.5 0.5 38.5 3.5 L 38.5 21.5 C 38.5 24.5 38.5 24.5 35.5 24.5 L 24.5 24.5 18.5 30.5 12.5 24.5 3.5 24.5 C 0.5 24.5 0.5 24.5 0.5 21.5 L 0.5 3.5 C 0.5 0.5 0.5 0.5 3.5 0.5";
            if ( green ) pathData = 'M 3.5 0.5 L 14.5 0.5 20.5 -5.5 26.5 0.5 33 0.5 C 36.5 0.5 36.5 0.5 36.5 3.5 L 36.5 21.5 C 36.5 24.5 36.5 24.5 33.5 24.5 L 3.5 24.5 C 0.5 24.5 0.5 24.5 0.5 21.5 L 0.5 3.5 C 0.5 0.5 0.5 0.5 3.5 0.5';
            let path = document.createElementNS( this.namespace, 'path' );
            path.setAttributeNS( null, 'stroke', '#000' );
            path.setAttributeNS( null, 'fill', green ? '#4caf50' : '#f44336' );
            path.setAttributeNS( null, 'd', pathData );
            let textElement = this.text( 5, 16, obj.text, obj ); //{className: obj.className, anchor:obj.anchor, alignment:obj.alignment, fontSize:obj.fontSize}
            group.appendChild( path );
            group.appendChild( textElement );
            this.svg.appendChild( group );
        }*/
        for ( let obj of this.annotations ) {
            let textElement = this.text( this.nz( this.dx( obj.x ) ), this.nz( this.dy( obj.y ) ), obj.text, obj ); //{className: obj.className, anchor:obj.anchor, alignment:obj.alignment, fontSize:obj.fontSize}
            if ( textElement ) this.svg.appendChild( textElement );
        }
        if ( this.title ) svg.appendChild( this.text( 0, 1, this.title, { className: 'headline' } ) );
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
    isUSD( title ) {
        title = title.replace( '-', '/' );
        if ( title.includes( "/USD" ) ) return true;
        const stablecoins = ['BUSD', 'TUSD', 'USDC', 'PAX'];
        for ( let asset of stablecoins ) {
            if ( title.includes( `/${ asset }` ) ) return true;
        }
        return false;
    }
    nz( value, def = 0 ) {
        return isFinite( value ) ? value : def;
    }
    // Round 36 to 35, 39 to 40.
    roundMinutes( number, step = 5 ) {
        let value = Math.round( number / step ) * step;
        return value.toString().padEnd( 2, '0' );
    }
    // Display sats values instead of small fractions
    sats( number, maxdigits = 8, mindigits = 2 ) {
        if ( number <= 0.000099 ) return Math.round( number * 1e8 ).toString();// + " sats";
        return new Intl.NumberFormat( 'en-US', { style: 'decimal', minimumFractionDigits: mindigits, maximumFractionDigits: maxdigits } ).format( number );
    }
    // Format display for USD currency
    format_usd( number, maxPrecision = 2, minPrecision = 0 ) {
        if ( maxPrecision < 1 ) maxPrecision = 8;
        if ( minPrecision > maxPrecision ) minPrecision = maxPrecision;
        if ( maxPrecision < minPrecision ) maxPrecision = minPrecision;
        if ( this.precision ) [minPrecision, maxPrecision] = this.precision;
        let result = Intl.NumberFormat( 'en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: minPrecision, maximumFractionDigits: maxPrecision } ).format( number );
        //if ( maxPrecision == 0 && minPrecision == 0 ) return result.replace( /\.00$/, '' );
        return result;
    }
    // Format decimal precision
    format( number, maxPrecision = 8, minPrecision = 0 ) {
        if ( maxPrecision < 1 ) maxPrecision = 8;
        if ( this.precision ) [minPrecision, maxPrecision] = this.precision;
        return new Intl.NumberFormat( 'en-US', { style: 'decimal', minimumFractionDigits: minPrecision, maximumFractionDigits: maxPrecision } ).format( number );
    }
    // Automatically determine formatting
    autoformat( number, maxPrecision = 8, minPrecision = 0, satsDisplay = false, allowShortNumbers = this.shortNumbers ) {
        if ( isNaN( maxPrecision ) ) maxPrecision = 8;
        if ( isNaN( minPrecision ) ) minPrecision = 0;
        if ( this.precision ) [minPrecision, maxPrecision] = this.precision;
        if ( allowShortNumbers !== false && number >= 1000 ) {
            return this.short_number( number, allowShortNumbers );
        }
        if ( this.precision && this.usd ) {
            return this.format_usd( number, maxPrecision, minPrecision );
        }
        if ( this.precision ) {
            return this.format( number, maxPrecision, minPrecision );
        }
        if ( this.usd ) {
            if ( number >= 1 && maxPrecision > 2 ) maxPrecision = 2;
            else if ( number >= 0.01 && minPrecision < 2 ) minPrecision = 2;
            else if ( number >= 0.001 && minPrecision < 3 ) minPrecision = 3;
            else if ( number >= 0.0001 && minPrecision < 4 ) minPrecision = 4;
            else if ( number >= 0.00001 && minPrecision < 5 ) minPrecision = 5;
            else if ( number >= 0.000001 && minPrecision < 6 ) minPrecision = 6;
            return this.format_usd( number, maxPrecision, minPrecision );
        }
        //if ( number <= 0.00001 ) return this.format( number, 8, 8 );
        if ( satsDisplay && number <= 0.00099 ) return this.sats( number, maxPrecision, minPrecision );//this.format( number, 8, 2 )
        if ( number < 0.01 ) return this.format( number, maxPrecision, minPrecision ) //minPrecision < 3 ? 3 : minPrecision
        if ( number < 0.1 ) return this.format( number, maxPrecision, minPrecision ) //minPrecision < 2 ? 2 : 
        if ( number >= 1000 ) return this.format_usd( number, maxPrecision < 2 ? 2 : maxPrecision, minPrecision );
        if ( number >= 100 ) return this.format_usd( number, maxPrecision < 4 ? 4 : maxPrecision, minPrecision );
        if ( number >= 10 ) return this.format_usd( number, maxPrecision < 4 ? 4 : maxPrecision, minPrecision );
        if ( number < 10 ) return this.format( number, maxPrecision, minPrecision )
        return this.format( number, maxPrecision, minPrecision );
    }

    short_number( value, allowPrecision = this.shortNumbers ) {
        if ( value >= 1e9 ) return ( value / 1e9 ).toFixed( allowPrecision ) + 'b';
        if ( value >= 1e6 ) return ( value / 1e6 ).toFixed( allowPrecision ) + 'm';
        if ( value >= 1e3 ) return ( value / 1e3 ).toFixed( allowPrecision ) + 'k';
        return value;
    }

    constructor( target, options = {} ) {
        this.namespace = "http://www.w3.org/2000/svg";
        this.target = typeof target == "string" ? document.querySelector( target ) : target;
        this.type = typeof options.type == "undefined" ? "ohlcv" : options.type;
        this.theme = typeof options.theme == "undefined" ? "standard" : options.theme;
        this.style = this.theme == "light" || this.theme == "contrast" ? "light" : "dark";
        this.title = typeof options.title == "undefined" ? "" : options.title;
        this.keys = typeof options.keys == "undefined" ? {} : options.keys;
        this.usd = typeof options.usd == "undefined" ? this.isUSD( this.title ) : options.usd;
        this.showAll = typeof options.showAll == "undefined" ? true : options.showAll;
        this.enableZoom = typeof options.enableZoom == "undefined" ? true : options.enableZoom;
        //indicator color overlay: filter: brightness(0.5) sepia(1) hue-rotate(65deg) saturate(5);
        this.overlay = typeof options.overlay == "undefined" ? [] : options.overlay;
        this.annotations = typeof options.annotations == "undefined" ? [] : options.annotations; //[{text,x,y,className,anchor,alignment,size}]
        this.indicators = typeof options.indicators == "undefined" ? [] : options.indicators;
        this.regression = typeof options.regression == "undefined" ? false : options.regression;
        this.smoothing = typeof options.smoothing == "undefined" ? false : options.smoothing;
        this.gridlines = typeof options.gridlines == "undefined" ? true : options.gridlines;
        //this.analysis = typeof options.analysis == "undefined" ? false : options.analysis;
        this.margin_right = typeof options.margin_right == "undefined" ? 100 : options.margin_right;
        this.show_volume = typeof options.show_volume == "undefined" ? false : options.show_volume;
        this.margin_bottom = typeof options.margin_bottom == "undefined" ? this.show_volume ? 30 : 13 : options.margin_bottom;
        //this.styles = typeof options.styles == "undefined" ? {lines:{}} : options.styles;
        this.lines = typeof options.lines == "undefined" ? [] : options.lines;
        this.hlines = typeof options.hlines == "undefined" ? [] : options.hlines;
        this.precision = typeof options.precision == "undefined" ? false : options.precision;
        this.yAxisPrecision = typeof options.yAxisPrecision == "undefined" ? 2 : options.yAxisPrecision;
        this.yAxisCommas = typeof options.yAxisCommas == "undefined" ? false : true;
        this.shortNumbers = typeof options.shortNumbers == "undefined" ? false : options.shortNumbers;
        this.satsDisplay = typeof options.satsDisplay == "undefined" ? true : options.satsDisplay;
        this.watermark = typeof options.watermark == "undefined" ? "" : options.watermark;
        //this.polling = typeof options.polling == "undefined" ? false : options.polling;
        this.reset();
        if ( !this.target ) throw `Invalid target: ${ target }`;
        window.addEventListener( 'resize', this.resize.bind( this ) );
        if ( this.enableZoom ) this.target.addEventListener( 'wheel', this.scroll.bind( this ) );
        this.zoom = typeof options.zoom == "undefined" ? 0 : options.zoom;
        if ( typeof options.ticks !== "undefined" ) this.import( options.ticks, true );
        //else if ( this.zoom !== 0 ) this.render();
        setTimeout( () => { this.render(); }, 1, this );
    }
}
if ( typeof module !== 'undefined' && module.exports ) module.exports = Chartaholic;
