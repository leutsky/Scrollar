/**
 * Author: Alexander Leutsky
 * Project: Scrollar
 * License: MIT
 */

/**
 * options:
 *  element : jQuery|selector
 *  or
 *  container : jQuery|selector
 *
 *  autoUpdate : false|number > 100
 *
 *  hscroll : true|false
 *  vscroll : true|false
 */

(function (window, $) {
    window.Scrollar = function (options) {
        return new Scrollar(options);
    }
    // register as jQuery.plugin
    if (typeof $ === "function") {
        /**
         * jQuery.plugin
         * @param options
         * @return {*}
         *
         * options.element   = true|false // default = true
         * options.wrap      = true|false // dev. unsupport
         * options.container = true|false
         * options.hscroll   = true|false
         * options.vscroll   = true|false
         */
        $.fn.scrollar = function (options) {
            if (typeof options !== "object") options = {};

            var applyAs;

            if (options.container) {
                applyAs = "container";
                delete(options.element);
            } else {
                applyAs = "element";
                delete(options.container);
            }

            return this.each(function () {
                options[applyAs] = $(this);
                new Scrollar(options);
            });
        }
    } else {
        throw new Error("Scrollar: jQuery isn't defined.");
    }

    var axis_x = ["left", "pageX", "max_x", "scrollLeft"],
        axis_y = ["top", "pageY", "max_y", "scrollTop"];

    function template (m) {
        var area = '<div class="scrollar-viewport"><div class="scrollar-systemscrolls"><div class="scrollar-contentwrap"><div class="scrollar-content"></div></div></div></div>';
        var vtrack = '<div class="scrollar-scroll scrollar-vscroll"><div class="scrollar-btn scrollar-btnup"></div><div class="scrollar-btn scrollar-btndown"></div><div class="scrollar-track scrollar-vtrack"><div class="scrollar-thumb scrollar-vthumb"></div></div></div>';
        var htrack = '<div class="scrollar-scroll scrollar-hscroll"><div class="scrollar-btn scrollar-btnleft"></div><div class="scrollar-btn scrollar-btnright"></div><div class="scrollar-track scrollar-htrack"><div class="scrollar-thumb scrollar-hthumb"></div></div></div>';
        var corner = '<div class="scrollar-corner"></div>';

        area += vtrack + htrack + corner;

        if (m) area = '<div class="scrollar">' + area + '</div>';

        return area;
    }

    function normalizeOptions(options) {
        switch (typeof options) {
            case "string" :
                return { "element" : options, "hscroll" : true, "vscroll" : true }
            case "object" :
                if (!("element" in options || "container" in options || "wrap" in options)) {
                    throw new Error("Scrollar.options must contain 'element' or 'container'");
                }

                // autoUpdate
                if (!("autoUpdate" in options)) {
                    options.autoUpdate = false;
                }
                if (typeof options.autoUpdate === "number" && options.autoUpdate < 30) {
                    options.autoUpdate = false;
                }

                options.hscroll = ("hscroll" in options) ? !!options.hscroll : true ;
                options.vscroll = ("vscroll" in options) ? !!options.vscroll : true ;
                return options;
            default :
                throw new TypeError("Scrollar.options isn't object or string");
        }
    }

    /**
     * Scrollar
     * @param {jQuery|object|string} options
     * @constructor
     */
    function Scrollar (options) {
        var _this = this;

        this.options = options = normalizeOptions(options);

        var children;

        if ("container" in options) {
            var $container = $(options.container);

            children = $container.contents().detach();
            this.$ = $(template(true));

            $container.append(this.$);
        } else if ("element" in options) {
            this.$ = $(options.element);
            children = this.$.contents().detach();

            if (!this.$.hasClass("scrollar")) this.$.addClass("scrollar");
            this.$.append(template());
        }

        var vp = this.$vp = $(".scrollar-viewport", this.$); // viewport
        var ss = this.$ss = $(".scrollar-systemscrolls", this.$); // systemscrolls
        var cw = this.$cw = $(".scrollar-contentwrap", this.$); // contentwrap
        var ct = this.$ct = $(".scrollar-content", this.$); // content

        ct.append(children);

        var env = this.__env = {};
        var htrack, hthumb, hscroll,
            vtrack, vthumb, vscroll;

        // Options
        // ..add classes
        if (!options.hscroll) this.$.addClass("scrollar-nohscroll");
        if (!options.vscroll) this.$.addClass("scrollar-novscroll");

        // ..horizontal scroll
        env.correct_w = ss[0].clientWidth - vp.width();
        if (options.hscroll) {
            hscroll = this.$hscroll = $(".scrollar-hscroll", this.$); // h scroll
            htrack = this.$htrack = $(".scrollar-htrack", this.$); // h track
            hthumb = this.$hthumb = $(".scrollar-hthumb", this.$); // h thumb

            this.$bl = $(".scrollar-btnleft", this.$); // btn left
            this.$bl.click(function () { _this.scrollLeft(-20); });

            this.$br = $(".scrollar-btnright", this.$); // btn right
            this.$br.click(function () { _this.scrollRight(-20); });

            env.hscroll = { "scroll" : hscroll, "track" : htrack, "thumb" : hthumb, "axis" : axis_x };
        } else {
            ct.css("right", env.correct_w);
        }
        // ..vertical scroll
        env.correct_h = ss[0].clientHeight - vp.height();
        if (options.vscroll) {
            vscroll = this.$vscroll = $(".scrollar-vscroll", this.$); // v scroll
            vtrack = this.$vtrack = $(".scrollar-vtrack", this.$); // v track
            vthumb = this.$vthumb = $(".scrollar-vthumb", this.$); // v thumb

            this.$bu = $(".scrollar-btnup", this.$); // btn up
            this.$bu.click(function () { _this.scrollTop(-20); });

            this.$bd = $(".scrollar-btndown", this.$); // btn down
            this.$bd.click(function () { _this.scrollBottom(-20); });

            env.vscroll = { "scroll" : vscroll, "track" : vtrack, "thumb" : vthumb, "axis" : axis_y };
        } else {
            ct.css("bottom", env.correct_h);
        }


        // Управление процессом прокрутки
        (function () {
            var thumb, track, delta, axis, scroll,
                doc = $(document);

            function init () {
                ss.on("scroll.scrollar", dragThumbs);

                if (options.hscroll) hthumb.on("mousedown.scrollar", start_h);
                if (options.vscroll) vthumb.on("mousedown.scrollar", start_v);
            }

            function start_h (e) {
                scroll = env.hscroll;
                start(e);
                return false;
            }

            function start_v (e) {
                scroll = env.vscroll;
                start(e);
                return false;
            }

            function start (e) {
                axis = scroll.axis;

                track = scroll.track;
                scroll.scroll.addClass("scrollar-active-scroll");

                thumb = scroll.thumb;

                //if (options.hscroll) hthumb.off("mousedown.scrollar");
                //if (options.vscroll) vthumb.off("mousedown.scrollar");

                delta = track.offset()[axis[0]] + e[axis[1]] - thumb.offset()[axis[0]];

                ss.off("scroll.scrollar");

                doc.on("mouseup.scrollar", end);
                doc.on("mousemove.scrollar", drag);
            }

            function end () {
                scroll.scroll.removeClass("scrollar-active-scroll");

                doc.off("mouseup.scrollar");
                doc.off("mousemove.scrollar");

                init();

                return false;
            }

            function drag (e) {
                var pos = e[axis[1]] - delta;
                if (pos < scroll.min_pos) {
                    pos = scroll.min_pos;
                } else if (pos > scroll.max_pos) {
                    pos = scroll.max_pos;
                }

                thumb.css(axis[0], pos);
                ss[axis[3]](pos * scroll.ratio);
            }

            function dragThumbs () {
                if (options.hscroll) hthumb.css("left", ss.scrollLeft() / env.hscroll.ratio);
                if (options.vscroll) vthumb.css("top", ss.scrollTop() / env.vscroll.ratio);
            }

            init();
        })();

        var _update = function () { _this.update(); }
        $(window).resize(_update);

        if (typeof options.autoUpdate === "number") {
            setInterval(_update, options.autoUpdate);
        }
        setTimeout(_update, 20);
    }

    Scrollar.prototype.__checkChanges = function () {
        var options = this.options;

        if (options.hscroll) {

        }

        if (options.vscroll) {

        }
    }

    /**
     * Scrollar.update
     */
    Scrollar.prototype.update = function () {
        var x, y, scroll;
        var options = this.options,
            env = this.__env,
            ss = this.$ss[0],
            cw = this.$cw[0],
            ct = this.$ct[0];

        // Горизонтальный скрол
        if (options.hscroll) {
            scroll = env.hscroll;

            var ss_cw = ss.clientWidth;

            // Корректировка ширины contentwrap
            cw.style.width = (ct.offsetWidth + env.correct_w) + "px";
            while (Math.abs(cw.scrollWidth - ct.offsetWidth) <= 1) {
                cw.style.width = (ct.offsetWidth + 1000) + "px";
                cw.style.width = (ct.offsetWidth + env.correct_w) + "px";
            }

            var ss_sw = ss.scrollWidth;

            // Ширина горизонтального ползунка
            var htrack_w = scroll.track.width();
            var hthumb_w = htrack_w * ss_cw / ss_sw;
            if (hthumb_w > htrack_w) {
                hthumb_w = htrack_w;
            } else if (hthumb_w < 30) {
                hthumb_w = 30;
            }
            scroll.thumb.outerWidth(hthumb_w);

            // Коэффициенты пропорциональности
            x = htrack_w - hthumb_w;
            scroll.ratio = (ss_sw - ss_cw) / (x < 1 ? 1 : x);
            if (scroll.ratio < 1) scroll.ratio = 1;

            // Крайние положение ползунка
            scroll.min_pos = 0;
            scroll.max_pos = htrack_w - hthumb_w;

            // Корректировка положения ползунка
            scroll.thumb.css("left", ss.scrollLeft / scroll.ratio);
        }

        // Вертикальный скролл
        if (options.vscroll) {
            scroll = env.vscroll;

            var ss_ch = ss.clientHeight;

            // Корректировка высоты contentwrap
            cw.style.height = (ct.offsetHeight + env.correct_h) + "px";
            while (Math.abs(cw.scrollHeight - ct.offsetHeight) <= 1) {
                cw.style.height = (ct.offsetHeight + 1000) + "px";
                cw.style.height = (ct.offsetHeight + env.correct_w) + "px";
            }

            var ss_sh = ss.scrollHeight;

            // Высота вертикального ползунка
            var vtrack_h = scroll.track.height();
            var vthumb_h = vtrack_h * ss_ch / ss_sh;
            if (vthumb_h > vtrack_h) {
                vthumb_h = vtrack_h;
            } else if (vthumb_h < 30) {
                vthumb_h = 30;
            }
            scroll.thumb.outerHeight(vthumb_h);

            // Коэффициенты пропорциональности
            y = vtrack_h - vthumb_h;
            scroll.ratio = (ss_sh - ss_ch) / (y < 1 ? 1 : y);
            if (scroll.ratio < 1) scroll.ratio = 1;

            // Крайние положение ползунка
            scroll.min_pos = 0;
            scroll.max_pos = vtrack_h - vthumb_h;

            // Корректировка положения ползунка
            scroll.thumb.css("top", ss.scrollTop / scroll.ratio);
        }
    }

    /**
     * Scrollar.content
     * @param {string} act
     * @param {jQuery|html|text} content
     * @return {jQuery}
     */
    Scrollar.prototype.content = function (act, content) {
        switch (arguments.length) {
            case 0 :
                return this.$ct;
            case 1 :
                content = act;
                act = "html";
        }

        this.$ct[act](content);

        this.update();
    }

    /**
     * Scrollar.scrollTop
     * @param {number} pos
     * @return {number}
     */
    Scrollar.prototype.scrollTop = function (pos) {
        var ss = this.$ss[0];

        if (arguments.length == 0) {
            return ss.scrollTop;
        } else if (pos < 0) {
            pos = ss.scrollTop + pos;
            if (pos < 0) pos = 0;
        } else {
            var max_pos = ss.scrollHeight - ss.clientHeight;
            if (max_pos < 0) pos = 0;
            else if (pos > max_pos) pos = max_pos;
        }

        ss.scrollTop = pos;
    }

    /**
     * Scrollar.scrollBottom
     * @param {number} pos
     * @return {number}
     */
    Scrollar.prototype.scrollBottom = function (pos) {
        var ss = this.$ss[0];

        if (arguments.length == 0) {
            return ss.scrollHeight - ss.clientHeight - ss.scrollTop;
        } else {
            var max_pos = ss.scrollHeight - ss.clientHeight;
            if (pos < 0) {
                pos = ss.scrollTop - pos;
                if (pos > max_pos) pos = max_pos;
            } else if (pos > max_pos) {
                pos = 0;
            } else {
                pos = max_pos - pos;
            }
        }

        ss.scrollTop = pos;
    }

    /**
     * Scrollar.scrollLeft
     * @param {number} pos
     * @return {number}
     */
    Scrollar.prototype.scrollLeft = function (pos) {
        var ss = this.$ss[0];

        if (arguments.length == 0) {
            return ss.scrollLeft;
        } else if (pos < 0) {
            pos = ss.scrollLeft + pos;
            if (pos < 0) pos = 0;
        } else {
            var max_pos = ss.scrollWidth - ss.clientWidth;
            if (max_pos < 0) pos = 0;
            else if (pos > max_pos) pos = max_pos;
        }

        ss.scrollLeft = pos;
    }

    /**
     * Scrollar.scrollRight
     * @param {number} pos
     * @return {number}
     */
    Scrollar.prototype.scrollRight = function (pos) {
        var ss = this.$ss[0];

        if (arguments.length == 0) {
            return ss.scrollWidth - ss.clientWidth - ss.scrollLeft;
        } else {
            var max_pos = ss.scrollWidth - ss.clientWidth;
            if (pos < 0) {
                pos = ss.scrollLeft - pos;
                if (pos > max_pos) pos = max_pos;
            } else if (pos > max_pos) {
                pos = 0;
            } else {
                pos = max_pos - pos;
            }
        }

        ss.scrollLeft = pos;
    }
}) (window, jQuery);