  /*!
   * Lightweight Colorpicker - jQuery Plugin
   * Provides simple scalable colorpicker
   * 
   * © 2012 Dmitriy Kubyshkin (http://kubyshkin.ru)
   * 
   * Version: 1.0
   * Requires: jQuery v1.7+
   *
   * Dual licensed under the MIT and GPL licenses:
   *   http://www.opensource.org/licenses/mit-license.php
   *   http://www.gnu.org/licenses/gpl.html
   */
(function(){

  var use3dTransform = typeof WebKitCSSMatrix != 'undefined' && (new WebKitCSSMatrix).m11;

  var events = {
    start: 'mousedown touchstart',
    move: 'mousemove touchmove',
    end: 'mouseup touchend'
  };

  // For some reason iPad doesn't have function binding so we fill it in
  if(!Function.prototype.bind) {
    Function.prototype.bind = function(context) {
      var args = Array.prototype.slice.call(arguments, 2),
          func = this;
      return function() {
        return func.apply(context, args.concat(Array.prototype.slice.call(arguments)));
      };
    }
  }

  /**
   * Converts array of rgb ints to hex string
   * @param {Array} rgb
   */
  var RGBToHex = function(rgb) {
    var r = (rgb[0]).toString(16),
        g = (rgb[1]).toString(16),
        b = (rgb[2]).toString(16);
    r.length > 1 || (r = '0' + r);
    g.length > 1 || (g = '0' + g);
    b.length > 1 || (b = '0' + b);
    return r+g+b
  };

  /**
   * Converts hex string to array of rgb ints
   * @param {string} hex
   * @return {Array}
   */
  var HexToRGB = function(hex) {
    hex = hex.replace('#', '');
    // For short version like #fff
    if (hex.length === 3) {
      hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
    }
    return [
      parseInt(hex.substring(0,2),16),
      parseInt(hex.substring(2,4),16),
      parseInt(hex.substring(4,6),16)
    ];
  };

  /**
   * Converts array of HSB floats (from 0 to 1) to array of RGB ints
   * @param {Array} hsb
   * @return {Array}
   */
  var HSBToRGB = function(hsb) {
    var h = (hsb[0] - Math.floor(hsb[0])) * 6.0,
        f = h - Math.floor(h),
        p = hsb[2] * (1 - hsb[1]),
        q = hsb[2] * (1 - hsb[1] * f),
        t = hsb[2] * (1 - hsb[1] * (1 - f)),
        r = 0,
        g = 0,
        b = 0;

    switch (Math.floor(h)) {
      case 0:
        r = hsb[2] * 255.0 + 0.5;
        g = t * 255.0 + 0.5;
        b = p * 255.0 + 0.5;
      break;

      case 1:
        r = q * 255.0 + 0.5;
        g = hsb[2] * 255.0 + 0.5;
        b = p * 255.0 + 0.5;
      break;

      case 2:
        r = p * 255.0 + 0.5;
        g = hsb[2] * 255.0 + 0.5;
        b = t * 255.0 + 0.5;
      break;

      case 3:
        r = p * 255.0 + 0.5;
        g = q * 255.0 + 0.5;
        b = hsb[2] * 255.0 + 0.5;
      break;

      case 4:
        r = t * 255.0 + 0.5;
        g = p * 255.0 + 0.5;
        b = hsb[2] * 255.0 + 0.5;
      break;

      case 5:
        r = hsb[2] * 255.0 + 0.5;
        g = p * 255.0 + 0.5;
        b = q * 255.0 + 0.5;
      break;
    }
    return [Math.floor(r), Math.floor(g), Math.floor(b)];
  };

  /**
   * Converts array of RGB ints to array of HSB floats (0 to 1)
   * @param {[type]} rgb [description]
   */
  var RGBToHSB = function(rgb) {
    var r = rgb[0] / 255,
        g = rgb[1] / 255,
        b = rgb[2] / 255,
        max = Math.max(r, g, b),
        min = Math.min(r, g, b),
        h, s, v = max,
        d = max - min;

    s = max == 0 ? 0 : d / max;

    if(max == min) {
        h = 0; // achromatic
    } else {
      switch(max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
      }
      h /= 6;
    }
    return [h, s, v];
  };

  /**
   * Colorpicker constructor
   * @param  {Node} node
   * @param {Object} options
   * @constructor
   */
  var LightweightColorpicker = function(input) {
    // Binding this to the object
    this.dragStart = this.dragStart.bind(this);
    this.dragMove = this.dragMove.bind(this);
    this.dragEnd = this.dragEnd.bind(this);
    this.onChange = this.onChange.bind(this);

    // // Some defaults
    this.dragging = false;

    // // Creating a picker html
    this.$input = $(input).on('change input', this.onChange);
    this.$el = $('<div class="lw-colorpicker"/>')
                .html(LightweightColorpicker.template)
                .on(events.start, function(e){ return false; })
                .on(events.start, '.lw-sb, .lw-h', this.dragStart)
                .appendTo(document.body);

    this.onChange();
    this.updatePosition();
  };

  /**
   * HTML template for colorpicker
   * @type {string}
   */
  LightweightColorpicker.template = 
  '<div class="lw-sb">\
    <img alt="" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAQAAAAABCAYAAAAxWXB3AAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAEFJREFUeNpi/A8EDAwMIMxAgCYkhs4mho9LjBg5euJ/FMj/o7EYpXxamPmPDuFAjbihJyY1nZOSl4jNoxg0QIABAI+56gCQgk6WAAAAAElFTkSuQmCC">\
    <img alt="" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAEACAYAAAByPhyYAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAEFJREFUeNpiYIACRiYQyUQci1gJbFySxPBLkKRkkBBM1FPHNEAS9BAbeIuoLUGTJDBICEpyKJnFA+mFEVYWQIABAG2AAvsKiLR6AAAAAElFTkSuQmCC">\
    <div class="lw-handle"></div>\
   </div>\
   <div class="lw-h">\
    <img alt="" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAEACAIAAAD9XIvPAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAALxJREFUeNp00tkKhTAMBNB07/3/n7WL7U0hwhDSh8OkKjoEaRN5oggSy5DFUA2/y4wKZJH3oyQibVp+kfMv9zumGJDdyKMZiaxr+nq/GMoE3JMcnY1uT4H3GlmCzIYCqpHVOFvPfjJkgvx6RC65uJ9bvOdXTDBAh0QNUs8W69luGAr24u1ux6slH3jDESQli2IkqpdZn7Oakf429KLNXbm2pymGZJe5iwZ5PGp+1Pxc7jWlKwPwD7sD/QUYAMWijuyJPChnAAAAAElFTkSuQmCC">\
    <div class="lw-handle"></div>\
   </div>';

  /**
   * Destructor
   */
  LightweightColorpicker.prototype.destroy = function() {
    this.$el.remove();
  };

  /**
   * Moves handle to a spot specified by mouse event
   * @param  {Event} e
   * @return {boolean}
   */
  LightweightColorpicker.prototype.dragStart = function(e) {
    if (e.which !== 1) return; // left mouse button click

    var area = $(e.currentTarget),
        offset = area.offset();

    this.area = 'h';
    this.areaOffset = offset;
    this.areaDimensions = {
      width: area.width(),
      height: area.height()
    }
    this.dragging = area.find('.lw-handle')
    $(document.body).on(events.move, this.dragMove);
    $(document.body).on(events.end, this.dragEnd);

    // Changing left offset of handle only in saturation/brightness area
    if(area.hasClass('lw-sb')) {
      this.area = 'sb';
    }
    this.dragMove(e);
    return false;
  };

  /**
   * Drag mode handler
   * @param  {MouseEvent} e
   * @return {bool}
   */
  LightweightColorpicker.prototype.dragMove = function(e) {
    if(!this.dragging) return;

    var newPosition = {
      top: e.pageY - this.areaOffset.top,
      left: 0
    };

    if(this.area === 'sb') {
      newPosition.left = e.pageX - this.areaOffset.left;
    }

    // Making sure we are within bounds
    newPosition.left >= 0 || (newPosition.left = 0);
    newPosition.top >= 0 || (newPosition.top = 0);
    newPosition.left <= this.areaDimensions.width || (newPosition.left = this.areaDimensions.width);
    newPosition.top <= this.areaDimensions.height || (newPosition.top = this.areaDimensions.height);

    this.setPosition(this.dragging, newPosition);

    var hsb = this.getHSB();
    this.updateInput('#' + RGBToHex(HSBToRGB(hsb)));
    hsb[1] = hsb[2] = 1;
    this.$el.find('.lw-sb').css('background', '#' + RGBToHex(HSBToRGB(hsb)));

    return false;
  };
  
  /**
   * Drag end handler
   * @param  {MouseEvent} e
   * @return {bool}
   */
  LightweightColorpicker.prototype.dragEnd = function(e) {
    if(!this.dragging) return;
    this.dragging = null;

    $(document.body).unbind(events.move, this.dragMove);
    $(document.body).unbind(events.end, this.dragEnd);

    return false;
  };

  /**
   * Handler for input change event
   * @return {string}
   */
  LightweightColorpicker.prototype.onChange = function() {
    if(this.dragging) return;
    var hex = this.$input.val()
    if (hex.match(/^\#?[0-9a-fA-F]{3}([0-9a-fA-F]{3})?$/)) {
      this.setHex(hex);
    }
  };

  /**
   * Gets colorpicker value in RGB format
   * @return {string}
   */
  LightweightColorpicker.prototype.getHex = function() {
    return RGBToHex(this.getRGB());
  }

  /**
   * Sets colorpicker value in as RGB hex string
   * @param {string} hex
   */
  LightweightColorpicker.prototype.setHex = function(hex) {
    this.setRGB(HexToRGB(hex));
  };

  /**
   * Gets colorpicker value in RGB format
   * @return {Array} hsb
   */
  LightweightColorpicker.prototype.getRGB = function() {
    return HSBToRGB(this.getHSB());
  };

  /**
   * Sets colorpicker value in RGB format
   * @param {Array} rgb
   */
  LightweightColorpicker.prototype.setRGB = function(rgb) {
    this.setHSB(RGBToHSB(rgb));
  };

  /**
   * Gets colorpicker value in HSB format
   * @return {Array} hsb
   */
  LightweightColorpicker.prototype.getHSB = function() {
    var sb = this.$el.find('.lw-sb'),
        h = this.$el.find('.lw-h'),
        sbPosition = this.getPosition(sb.find('.lw-handle')),
        hPosition = this.getPosition(h.find('.lw-handle'));

    return [
      1 - hPosition.top / h.height(),
      sbPosition.left / sb.width(),
      1 - sbPosition.top / sb.height()
    ];
  };

  /**
   * Sets colorpicker value in HSB format
   * @param {Array} hsb
   */
  LightweightColorpicker.prototype.setHSB = function(hsb) {
    var sb = this.$el.find('.lw-sb'),
        h = this.$el.find('.lw-h');
    this.setPosition(sb.find('.lw-handle'), {
      top: Math.floor((1 - hsb[2]) * sb.height()),
      left: Math.floor(hsb[1] * sb.width())
    });
    this.setPosition(h.find('.lw-handle'), {
      top: Math.floor((1 - hsb[0]) * h.height()),
      left: 0
    });
    hsb[1] = hsb[2] = 1;
    this.$el.find('.lw-sb').css('background', '#' + RGBToHex(HSBToRGB(hsb)));
  };

  /**
   * Updates input field
   * @param  {string} value
   */
  LightweightColorpicker.prototype.updateInput = function(value) {
    this.$input.val(value).trigger('change');
  };

  /**
   * Moves picker next to input field
   */
  LightweightColorpicker.prototype.updatePosition = function() {
    var inputOffset, left, top, wrapperOuterHeight, wrapperOuterWidth;
    inputOffset = this.$input.offset();
    wrapperOuterWidth = this.$el.outerWidth();
    wrapperOuterHeight = this.$el.outerHeight();
    left = inputOffset.left;
    if ($('body').width() > left + wrapperOuterWidth) {
      this.$el.css({
        'left': left
      });
    } else {
      if (inputOffset.left > wrapperOuterWidth) {
        this.$el.css({
          'left': $('body').width() - wrapperOuterWidth
        });
      } else {
        this.$el.css({
          'left': left
        });
      }
    }
    this.$el.removeClass('lw-opposite-vertical');
    top = inputOffset.top + this.$input.outerHeight();
    if ($(document).height() > top + wrapperOuterHeight) {
      this.$el.css({
        'top': top
      });
    } else {
      if (inputOffset.top > wrapperOuterHeight) {
        this.$el.css({
          'top': inputOffset.top - wrapperOuterHeight
        });
        this.$el.addClass('lw-opposite-vertical');
      } else {
        this.$el.css({
          'top': top
        });
      }
    }
  };

  // Depending on whether browser supports 3d transform we use differen way
  // of getting and setting offsets
  if(use3dTransform) {
    /**
     * Gets handle offset
     * @param  {object} el
     * @return {object}
     */
    LightweightColorpicker.prototype.getPosition = function(el) {
      var transform = el.get(0).style.webkitTransform,
          offset = { top: 0, left: 0 };
      if(transform) {
        transform = transform.split('(')[1].split(',');
        offset.left = parseInt(transform[0]);
        offset.top = parseInt(transform[1]);
      }
      return offset;
    };

    /**
     * Set handle offset
     * @param  {object} el
     * @return {object}
     */
    LightweightColorpicker.prototype.setPosition = function(el, offset) {
      el.get(0).style.webkitTransform = 'translate3d(' + offset.left +
                                        'px,' + offset.top + 'px,0)';
    };
  } else {
    /**
     * Gets handle offset
     * @param  {object} el
     * @return {object}
     */
    LightweightColorpicker.prototype.getPosition = function(el) {
      return el.position();
    };

    /**
     * Set handle offset
     * @param  {object} el
     * @return {object}
     */
    LightweightColorpicker.prototype.setPosition = function(el, offset) {
      el.css(offset);
    };
  }

  // Watching all inputs with special data-type attribute
  $(function(){
    $(document).on('focus', '[data-type="color"]', function(e){
      var input = $(e.target),
          picker = new LightweightColorpicker(input),
          blur = function() {
            picker.destroy();
            input.off('blur', blur);
          };
      input.on('blur', blur);
    });
  });

})();
