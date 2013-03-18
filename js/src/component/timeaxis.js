/**
 * A horizontal time axis
 * @param {Object} [config] Available config parameters:
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
function TimeAxis (config) {
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
    this.config.mode = 'bottom';
    this.config.showMinorLabels = true;
    this.config.showMajorLabels = true;

    this.setConfig(config);
}

TimeAxis.prototype = new Component();

TimeAxis.prototype.setConfig = function (config) {
    Component.prototype.setConfig.call(this, config);

    if (config.start) {
        this.start = cast(config.start, 'Date');
    }
    if (config.end) {
        this.end = cast(config.end, 'Date');
    }
};


/**
 * Calculate the factor and offset to convert a position on screen to the
 * corresponding date and vice versa.
 * After the method calcConversionFactor is executed once, the methods screenToTime and
 * timeToScreen can be used.
 */
TimeAxis.prototype.updateConversion = function() {
    this.conversion.offset = this.start.valueOf();
    this.conversion.factor = this.width /
        (this.end.valueOf() - this.start.valueOf());
};


/**
 * Convert a position on screen (pixels) to a datetime
 * Before this method can be used, the method updateConversion must be
 * executed once.
 * @param {int}     x    Position on the screen in pixels
 * @return {Date}   time The datetime the corresponds with given position x
 */
TimeAxis.prototype.toTime = function(x) {
    var conversion = this.conversion;
    return new Date(x / conversion.factor + conversion.offset);
};

/**
 * Convert a datetime (Date object) into a position on the screen
 * Before this method can be used, the method updateConversion must be
 * executed once.
 * @param {Date}   time A date
 * @return {int}   x    The position on the screen in pixels which corresponds
 *                      with the given date.
 */
TimeAxis.prototype.toScreen = function(time) {
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
        config = this.config;

    var frame = this.frame;
    if (!frame) {
        frame = document.createElement('div');
        this.frame = frame;
        needReflow = true;
    }
    frame.className = 'axis ' + this.config.mode;

    if (!frame.parentNode) {
        var container = Component.toDom(this.config.container);
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
        var top = Component.toSize(this.config.top, '0');
        if (frame.style.top != top) {
            frame.style.top = top;
            needReflow = true;
        }

        // update left
        frame.style.left = '0';

        // update width
        var width = Component.toSize(this.config.width, '100%');
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
        this.minimumStep = this.toTime(charWidth * 6) - this.toTime(0);
        step.setRange(this.start, this.end, this.minimumStep);

        this._repaintStart();

        step.first();
        var xFirstMajorLabel = undefined;
        var max = 0;
        while (step.hasNext() && max < 1000) {
            max++;
            var cur = step.getCurrent(),
                x = this.toScreen(cur),
                isMajor = step.isMajor();

            // TODO: lines must have a width, such that we can create css backgrounds

            if (config.showMinorLabels) {
                this._repaintMinorText(x, step.getLabelMinor());
            }

            if (isMajor && config.showMajorLabels) {
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
        if (config.showMajorLabels) {
            var leftTime = this.toTime(0),
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
        this.dom.minorTexts.push(label);

        this.frame.appendChild(label);
    }

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
        this.dom.majorTexts.push(label);
    }

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
        this.dom.minorLines.push(line);
    }

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
        this.dom.majorLines.push(line);
    }

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
        config = this.config;

    // line before all axis elements
    if (config.showMinorLabels || config.showMajorLabels) {
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
            showMinorLabels = this.config.showMinorLabels,
            showMajorLabels = this.config.showMajorLabels,
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
        switch (this.config.mode) {
            case 'bottom':
                props.minorLabelHeight = showMinorLabels ? props.minorCharHeight : 0;
                props.majorLabelHeight = showMajorLabels ? props.majorCharHeight : 0;

                props.minorLabelTop = 0;
                props.majorLabelTop = props.minorLabelTop + props.minorLabelHeight;

                props.minorLineTop = -this.top;
                props.minorLineHeight = parentHeight - props.majorLabelHeight;
                props.minorLineWidth = 1; // TODO: really calculate width

                props.majorLineTop = -this.top;
                props.majorLineHeight = parentHeight;
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
                props.minorLineHeight = parentHeight - props.majorLabelHeight;
                props.minorLineWidth = 1; // TODO: really calculate width

                props.majorLineTop = 0;
                props.majorLineHeight = parentHeight;
                props.majorLineWidth = 1; // TODO: really calculate width

                props.lineTop = props.majorLabelHeight +  props.minorLabelHeight;

                break;

            default:
                throw new Error('Unkown mode "' + this.config.mode + '"');
        }

        var height = props.minorLabelHeight + props.majorLabelHeight;
        if (height != this.height) {
            this.height = height;
            needRepaint = true;
        }

        this.updateConversion();
    }

    if (needRepaint) {
        this.requestRepaint();
    }
};
