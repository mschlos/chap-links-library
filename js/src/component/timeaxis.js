/**
 * A horizontal time axis
 * @param {Object} [options] Available parameters:
 *                          {String} [id]
 *                          {HTMLElement} container
 *                          {Array} depends           Components on which this
 *                                                    component is dependent
 *                          {String | Number | function} [left]
 *                          {String | Number | function} [top]
 *                          {String | Number | function} [width]
 *                          {String | Number | function} [height]
 *                          {String} [start]
 *                          {String} [end]
 * @constructor TimeAxis
 * @extends Component
 */
function TimeAxis (options) {
    this.dom = {
        majorLines: [],
        majorTexts: [],
        minorLines: [],
        minorTexts: [],
        redundant: {
            majorLines: [],
            majorTexts: [],
            minorLines: [],
            minorTexts: []
        }
    };
    this.props = {};
    this.conversion = {};
    this.step = new TimeStep();

    // default configuration
    this.options.mode = 'bottom';
    this.options.showMinorLabels = true;
    this.options.showMajorLabels = true;

    this.setOptions(options);
}

TimeAxis.prototype = new Component();

TimeAxis.prototype.setOptions = function (options) {
    Component.prototype.setOptions.call(this, options);

    if (options.start) {
        this.start = cast(options.start, 'Date');
    }
    if (options.end) {
        this.end = cast(options.end, 'Date');
    }
    this._updateConversion();
};


/**
 * Set a new value for the visible range int the timeline.
 * Set start undefined to include everything from the earliest date to end.
 * Set end undefined to include everything from start to the last date.
 * Example usage:
 *    TimeAxis.setVisibleChartRange(new Date("2010-08-22"),
 *                                    new Date("2010-09-13"));
 * @param {Date | String | Number}  start   The start date for the timeline
 * @param {Date | String | Number}  end     The end date for the timeline
 * @param {boolean} [redraw]                If true (default) the Timeline is
 *                                          directly redrawn
 */
TimeAxis.prototype.setVisibleChartRange = function(start, end, redraw) {
    var newStart = cast(start, 'Date');
    var newEnd = cast(end, 'Date');

    // check for valid date
    if (!newStart || isNaN(newStart.valueOf())) {
        throw new Error('Invalid start date "' + start + '"');
    }
    if (!newEnd || isNaN(newEnd.valueOf())) {
        throw new Error('Invalid end date "' + end + '"');
    }

    // prevent start Date <= end Date
    if (newEnd <= newStart) {
        newEnd = new Date(newStart.valueOf());
        newEnd.setDate(newEnd.getDate() + 7);
    }

    this.start = newStart;
    this.end = newEnd;

    this._updateConversion();

    if (redraw == undefined || redraw == true) {
        this.requestRepaint();
    }
};

/**
 * Retrieve the current visible range in the timeline.
 * @return {Object} An object with start and end properties
 */
TimeAxis.prototype.getVisibleChartRange = function() {
    return {
        start: new Date(this.start.valueOf()),
        end: new Date(this.end.valueOf())
    };
};


/**
 * Calculate the factor and offset to convert a position on screen to the
 * corresponding date and vice versa.
 * After the method calcConversionFactor is executed once, the methods _toTime
 * and _toScreen can be used.
 */
TimeAxis.prototype._updateConversion = function() {
    this.conversion.offset = this.start.valueOf();
    this.conversion.factor = (this.width || 1) /
        (this.end.valueOf() - this.start.valueOf());
};


/**
 * Convert a position on screen (pixels) to a datetime
 * Before this method can be used, the method _updateConversion must be
 * executed once.
 * @param {int}     x    Position on the screen in pixels
 * @return {Date}   time The datetime the corresponds with given position x
 */
TimeAxis.prototype._toTime = function(x) {
    var conversion = this.conversion;
    return new Date(x / conversion.factor + conversion.offset);
};

/**
 * Convert a datetime (Date object) into a position on the screen
 * Before this method can be used, the method _updateConversion must be
 * executed once.
 * @param {Date}   time A date
 * @return {int}   x    The position on the screen in pixels which corresponds
 *                      with the given date.
 */
TimeAxis.prototype._toScreen = function(time) {
    var conversion = this.conversion;
    return (time.valueOf() - conversion.offset) * conversion.factor;
};

/**
 * Repaint the time axis
 */
TimeAxis.prototype.repaint = function () {
    console.log('repaint timeaxis ' + this.id.split('-')[0]); // TODO: cleanup logging

    var needReflow = false;
    var step = this.step,
        options = this.options;

    var frame = this.frame;
    if (!frame) {
        frame = document.createElement('div');
        this.frame = frame;
        needReflow = true;
    }
    frame.className = 'axis ' + options.mode;

    if (!frame.parentNode) {
        var defaultContainer = this.parent ? this.parent.frame : undefined;
        var container = Component.toDom(options.container, defaultContainer);
        if (!container) {
            throw new Error('Cannot repaint frame: no container attached');
        }
        while (container.firstChild) {
            container.removeChild(container.firstChild);
        }
        container.appendChild(frame);
        needReflow = true;
    }

    if (frame.parentNode) {
        // TODO: take frame offline while updating

        // update top
        var mode = options.mode;
        var defaultTop = (mode == 'bottom') ? (this.props.parentHeight - this.height) + 'px' : '0';
        var top = Component.toSize(options.top, defaultTop);
        if (frame.style.top != top) {
            frame.style.top = top;
            needReflow = true;
        }

        // update left
        var left = Component.toSize(options.left, '0');
        if (frame.style.left != left) {
            frame.style.left = left;
            needReflow = true;
        }

        // update width
        var width = Component.toSize(options.width, '100%');
        if (frame.style.width != width) {
            frame.style.width = width;
            needReflow = true;
        }

        // update height
        frame.style.height = this.height + 'px';

        // get character width
        this._repaintMeasureChars();
        var charWidth = this.props.minorCharWidth || 10;
        if (!('minorCharWidth' in this.props)) {
            needReflow = true;
        }

        // calculate best step
        this.minimumStep = this._toTime(charWidth * 6) - this._toTime(0);
        step.setRange(this.start, this.end, this.minimumStep);

        this._repaintStart();

        step.first();
        var xFirstMajorLabel = undefined;
        var max = 0;
        while (step.hasNext() && max < 1000) {
            max++;
            var cur = step.getCurrent(),
                x = this._toScreen(cur),
                isMajor = step.isMajor();

            // TODO: lines must have a width, such that we can create css backgrounds

            if (options.showMinorLabels) {
                this._repaintMinorText(x, step.getLabelMinor());
            }

            if (isMajor && options.showMajorLabels) {
                if (x > 0) {
                    if (xFirstMajorLabel == undefined) {
                        xFirstMajorLabel = x;
                    }
                    this._repaintMajorText(x, step.getLabelMajor());
                }
                this._repaintMajorLine(x);
            }
            else {
                this._repaintMinorLine(x);
            }

            step.next();
        }

        // create a major label on the left when needed
        if (options.showMajorLabels) {
            var leftTime = this._toTime(0),
                leftText = this.step.getLabelMajor(leftTime),
                widthText = leftText.length * this.props.minorCharWidth + 10; // upper bound estimation

            if (xFirstMajorLabel == undefined || widthText < xFirstMajorLabel) {
                this._repaintMajorText(0, leftText);
            }
        }

        this._repaintEnd();

        this._repaintLine();
    }

    if (needReflow) {
        this.requestReflow();
    }
};

/**
 * Start a repaint. Move all DOM elements to a redundant list, where they
 * can be picked for re-use, or can be cleaned up in the end
 * @private
 */
TimeAxis.prototype._repaintStart = function () {
    var dom = this.dom,
        redundant = dom.redundant;

    redundant.majorLines = dom.majorLines;
    redundant.majorTexts = dom.majorTexts;
    redundant.minorLines = dom.minorLines;
    redundant.minorTexts = dom.minorTexts;

    dom.majorLines = [];
    dom.majorTexts = [];
    dom.minorLines = [];
    dom.minorTexts = [];
};

/**
 * End a repaint. Cleanup leftover DOM elements in the redundant list
 * @private
 */
TimeAxis.prototype._repaintEnd = function () {
    each(this.dom.redundant, function (arr) {
        while (arr.length) {
            var elem = arr.pop();
            if (elem && elem.parentNode) {
                elem.parentNode.removeChild(elem);
            }
        }
    });
};


/**
 * Create a minor label for the axis at position x
 * @param {Number} x
 * @param {String} text
 * @private
 */
TimeAxis.prototype._repaintMinorText = function (x, text) {
    // reuse redundant label
    var label = this.dom.redundant.minorTexts.shift();

    if (!label) {
        // create new label
        var content = document.createTextNode('');
        label = document.createElement('div');
        label.appendChild(content);
        label.className = 'text minor';
        this.frame.appendChild(label);
    }
    this.dom.minorTexts.push(label);

    label.childNodes[0].nodeValue = text;
    label.style.left = x + 'px';
    label.style.top  = this.props.minorLabelTop + 'px';
    //label.title = title;  // TODO: this is a heavy operation
};

/**
 * Create a Major label for the axis at position x
 * @param {Number} x
 * @param {String} text
 * @private
 */
TimeAxis.prototype._repaintMajorText = function (x, text) {
    // reuse redundant label
    var label = this.dom.redundant.majorTexts.shift();

    if (!label) {
        // create label
        var content = document.createTextNode(text);
        label = document.createElement('div');
        label.className = 'text major';
        label.appendChild(content);
        this.frame.appendChild(label);
    }
    this.dom.majorTexts.push(label);

    label.childNodes[0].nodeValue = text;
    label.style.top = this.props.majorLabelTop + 'px';
    label.style.left = x + 'px';
    //label.title = title; // TODO: this is a heavy operation
};

/**
 * Create a minor line for the axis at position x
 * @param {Number} x
 * @private
 */
TimeAxis.prototype._repaintMinorLine = function (x) {
    // reuse redundant line
    var line = this.dom.redundant.minorLines.shift();

    if (!line) {
        // create vertical line
        line = document.createElement('div');
        line.className = 'grid vertical minor';
        this.frame.appendChild(line);
    }
    this.dom.minorLines.push(line);

    var props = this.props;
    line.style.top = props.minorLineTop + 'px';
    line.style.height = props.minorLineHeight + 'px';
    line.style.left = (x - props.minorLineWidth / 2) + 'px';
};

/**
 * Create a Major line for the axis at position x
 * @param {Number} x
 * @private
 */
TimeAxis.prototype._repaintMajorLine = function (x) {
    // reuse redundant line
    var line = this.dom.redundant.majorLines.shift();

    if (!line) {
        // create vertical line
        line = document.createElement('DIV');
        line.className = 'grid vertical major';
        this.frame.appendChild(line);
    }
    this.dom.majorLines.push(line);

    var props = this.props;
    line.style.top = props.majorLineTop + 'px';
    line.style.left = (x - props.majorLineWidth / 2) + 'px';
    line.style.height = props.majorLineHeight + 'px';
};


/**
 * Repaint the horizontal line for the axis
 * @private
 */
TimeAxis.prototype._repaintLine = function() {
    var line = this.dom.line,
        frame = this.frame,
        options = this.options;

    // line before all axis elements
    if (options.showMinorLabels || options.showMajorLabels) {
        if (line) {
            // put this line at the end of all childs
            frame.removeChild(line);
            frame.appendChild(line);
        }
        else {
            // create the axis line
            line = document.createElement('div');
            line.className = 'grid horizontal major';
            frame.appendChild(line);
            this.dom.line = line;
        }

        line.style.top = this.props.lineTop + 'px';
    }
    else {
        if (line && axis.parentElement) {
            frame.removeChild(axis.line);
            delete this.dom.line;
        }
    }
};

/**
 * Create characters used to determine the size of text on the axis
 * @private
 */
TimeAxis.prototype._repaintMeasureChars = function () {
    // calculate the width and height of a single character
    // this is used to calculate the step size, and also the positioning of the
    // axis
    var needReflow = false,
        dom = this.dom,
        text;

    if (!dom.characterMinor) {
        text = document.createTextNode("0");
        var measureCharMinor = document.createElement("DIV");
        measureCharMinor.className = "text minor measure";
        measureCharMinor.appendChild(text);
        this.frame.appendChild(measureCharMinor);

        dom.measureCharMinor = measureCharMinor;
        needReflow = true;
    }

    if (!dom.characterMajor) {
        text = document.createTextNode("0");
        var measureCharMajor = document.createElement("DIV");
        measureCharMajor.className = "text major measure";
        measureCharMajor.appendChild(text);
        this.frame.appendChild(measureCharMajor);

        dom.measureCharMajor = measureCharMajor;
        needReflow = true;
    }

    if (needReflow) {
        this.requestReflow();
    }
};

/**
 * Reflow the time axis
 */
TimeAxis.prototype.reflow = function () {
    console.log('reflow timeaxis ' + this.id.split('-')[0]); // TODO: cleanup logging

    var needRepaint = false;
    var frame = this.frame;
    if (frame) {
        var top = frame.offsetTop;
        if (top != this.top) {
            this.top = top;
            needRepaint = true;
        }

        var left = frame.offsetLeft;
        if (left != this.left) {
            this.left = left;
            needRepaint = true;
        }

        var width = frame.offsetWidth;
        if (width != this.width) {
            this.width = width;
            needRepaint = true;
        }

        // calculate size of a character
        var props = this.props,
            showMinorLabels = this.options.showMinorLabels,
            showMajorLabels = this.options.showMajorLabels,
            measureCharMinor = this.dom.measureCharMinor,
            measureCharMajor = this.dom.measureCharMajor;
        if (measureCharMinor) {
            props.minorCharHeight = measureCharMinor.clientHeight;
            props.minorCharWidth = measureCharMinor.clientWidth;
        }
        if (measureCharMajor) {
            props.majorCharHeight = measureCharMajor.clientHeight;
            props.majorCharWidth = measureCharMajor.clientWidth;
        }

        var parentHeight = frame.parentNode ? frame.parentNode.offsetHeight : 0;
        if (parentHeight != props.parentHeight) {
            props.parentHeight = parentHeight;
            needRepaint = true;
        }
        switch (this.options.mode) {
            case 'bottom':
                props.minorLabelHeight = showMinorLabels ? props.minorCharHeight : 0;
                props.majorLabelHeight = showMajorLabels ? props.majorCharHeight : 0;

                props.minorLabelTop = 0;
                props.majorLabelTop = props.minorLabelTop + props.minorLabelHeight;

                props.minorLineTop = -this.top;
                props.minorLineHeight = this.top + props.majorLabelHeight;
                props.minorLineWidth = 1; // TODO: really calculate width

                props.majorLineTop = -this.top;
                props.majorLineHeight = this.top + props.minorLabelHeight + props.majorLabelHeight;
                props.majorLineWidth = 1; // TODO: really calculate width

                props.lineTop = 0;

                break;

            case 'top':
                props.minorLabelHeight = showMinorLabels ? props.minorCharHeight : 0;
                props.majorLabelHeight = showMajorLabels ? props.majorCharHeight : 0;

                props.majorLabelTop = 0;
                props.minorLabelTop = props.majorLabelTop + props.majorLabelHeight;

                // TODO: lineheight is not yet calculated correctly
                props.minorLineTop = props.minorLabelTop;
                props.minorLineHeight = parentHeight - props.majorLabelHeight - this.top;
                props.minorLineWidth = 1; // TODO: really calculate width

                props.majorLineTop = 0;
                props.majorLineHeight = parentHeight - this.top;
                props.majorLineWidth = 1; // TODO: really calculate width

                props.lineTop = props.majorLabelHeight +  props.minorLabelHeight;

                break;

            default:
                throw new Error('Unkown mode "' + this.options.mode + '"');
        }

        var height = props.minorLabelHeight + props.majorLabelHeight;
        if (height != this.height) {
            this.height = height;
            needRepaint = true;
        }

        this._updateConversion();
    }

    if (needRepaint) {
        this.requestRepaint();
    }
};
