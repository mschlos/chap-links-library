/**
 * A horizontal time axis
 * @param {Object} [options] Available parameters:
 *                          {String} [id]
 *                          {Component} parent
 *                          {Component[]} [depends]   Components on which this
 *                                                    component depends on
 *                          {Range | {start:number, end:number} } [range]
 * @constructor TimeAxis
 * @extends Component
 */
function TimeAxis (options) {
    this.id = util.randomUUID();

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
    this.options = {};
    this.conversion = null;
    this.range = null;

    // default configuration
    this.options.orientation = 'bottom';  // supported: 'top', 'bottom'
    // TODO: implement timeaxis orientations 'left' and 'right'
    this.options.moveable = true;
    this.options.zoomable = true;
    this.options.showMinorLabels = true;
    this.options.showMajorLabels = true;
    this.options.intervalMin = 10;
    this.options.intervalMax = 10;

    this.setOptions(options);
}

TimeAxis.prototype = new Component();

// TODO: comment
TimeAxis.prototype.setOptions = function (options) {
    Component.prototype.setOptions.call(this, options);

    if (options.range) {
        if (options.range instanceof Range) {
            this.range = options.range;

            // TODO: first unregister events from an existing range

            var me = this;
            this.range.on('rangechange', function () {
                // TODO: fix the delay in reflow/repaint, does not feel snappy
                me.requestReflow();
            });
            this.range.on('rangechanged', function () {
                me.requestReflow();
            });
        }
        else {
            if (!('start' in options.range) || !('end' in options.range)) {
                throw new TypeError('range must contain a start and end');
            }

            this.range = options.range;
        }
    }
};


/**
 * Calculate the factor and offset to convert a position on screen to the
 * corresponding date and vice versa.
 * After the method _updateConversion is executed once, the methods _toTime
 * and _toScreen can be used.
 * @private
 */
TimeAxis.prototype._updateConversion = function() {
    if (this.range) {
        if (this.range.conversion) {
            this.conversion = this.range.conversion(this.width);
        }
        else {
            this.conversion = Range.conversion(this.range.start, this.range.end, this.width);
        }
    }
};

/**
 * Convert a position on screen (pixels) to a datetime
 * Before this method can be used, the method _updateConversion must be
 * executed once.
 * @param {int}     x    Position on the screen in pixels
 * @return {Date}   time The datetime the corresponds with given position x
 * @private
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
 * @private
 */
TimeAxis.prototype._toScreen = function(time) {
    var conversion = this.conversion;
    return (time.valueOf() - conversion.offset) * conversion.factor;
};

/**
 * Repaint the component
 * @return {Boolean} changed
 */
TimeAxis.prototype.repaint = function () {
    var changed = 0,
        update = util.updateProperty,
        asSize = util.option.asSize,
        options = this.options,
        props = this.props,
        range = this.range,
        dom = this.dom;

    if (!range) {
        throw new Error('Cannot repaint time axis: no range configured');
    }

    var frame = this.frame;
    if (!frame) {
        frame = document.createElement('div');
        this.frame = frame;
        changed += 1;
    }
    frame.className = 'axis ' + options.orientation;
    // TODO: custom className?

    if (!frame.parentNode) {
        if (!this.parent) {
            throw new Error('Cannot repaint time axis: no parent attached');
        }
        var parentContainer = this.parent.getContainer();
        if (!parentContainer) {
            throw new Error('Cannot repaint time axis: parent has no container element');
        }
        parentContainer.appendChild(frame);

        changed += 1;
    }

    var parent = frame.parentNode;
    if (parent) {
        var beforeChild = frame.nextSibling;
        parent.removeChild(frame); //  take frame offline while updating (is almost twice as fast)

        var orientation = options.orientation;
        var defaultTop = (orientation == 'bottom') ? (this.props.parentHeight - this.height) + 'px' : '0';
        changed += update(frame.style, 'top', asSize(options.top, defaultTop));
        changed += update(frame.style, 'left', asSize(options.left, '0'));
        changed += update(frame.style, 'width', asSize(options.width, '100%'));
        changed += update(frame.style, 'height', asSize(options.height, this.height));

        // get character width
        this._repaintMeasureChars();

        // calculate best step
        this._updateConversion();
        var minimumStep = this._toTime((props.minorCharWidth || 10) * 5) - this._toTime(0);
        var step = new TimeStep(
            util.cast(range.start, 'Date'),
            util.cast(range.end, 'Date'),
            minimumStep);

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
                leftText = step.getLabelMajor(leftTime),
                widthText = leftText.length * (props.majorCharWidth || 10) + 10; // upper bound estimation

            if (xFirstMajorLabel == undefined || widthText < xFirstMajorLabel) {
                this._repaintMajorText(0, leftText);
            }
        }

        this._repaintEnd();

        this._repaintLine();

        // put frame online again
        if (beforeChild) {
            parent.insertBefore(frame, beforeChild);
        }
        else {
            parent.appendChild(frame)
        }
    }

    return (changed > 0);
};

var avg = 10;

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
    util.forEach(this.dom.redundant, function (arr) {
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
    var dom = this.dom,
        text;

    if (!dom.characterMinor) {
        text = document.createTextNode('0');
        var measureCharMinor = document.createElement('DIV');
        measureCharMinor.className = 'text minor measure';
        measureCharMinor.appendChild(text);
        this.frame.appendChild(measureCharMinor);

        dom.measureCharMinor = measureCharMinor;
    }

    if (!dom.characterMajor) {
        text = document.createTextNode('0');
        var measureCharMajor = document.createElement('DIV');
        measureCharMajor.className = 'text major measure';
        measureCharMajor.appendChild(text);
        this.frame.appendChild(measureCharMajor);

        dom.measureCharMajor = measureCharMajor;
    }
};

/**
 * Reflow the component
 * @return {Boolean} resized
 */
TimeAxis.prototype.reflow = function () {
    var changed = 0,
        update = util.updateProperty,
        frame = this.frame;

    if (frame) {
        changed += update(this, 'top', frame.offsetTop);
        changed += update(this, 'left', frame.offsetLeft);

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
            changed += 1;
        }
        switch (this.options.orientation) {
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
                throw new Error('Unkown orientation "' + this.options.orientation + '"');
        }

        var height = props.minorLabelHeight + props.majorLabelHeight;
        changed += update(this, 'width', frame.offsetWidth);
        changed += update(this, 'height', height);

        this._updateConversion();
    }

    return (changed > 0);
};
