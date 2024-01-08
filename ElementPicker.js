/*
 * https://github.com/azrafe7/ElementPicker.js
 * 
 * MIT Licensed
 * 
 * Copyright (c) 2019 Kevin Li [AlienKevin] (original work - https://github.com/AlienKevin/html-element-picker)
 * Copyright (c) 2023 Giuseppe Di Mauro [azrafe7] (fork with later additions/changes - https://github.com/azrafe7/ElementPicker.js)
 */

(function() {
  function ellipsize(text, length) {
    if (text.length > length) {
      return `${text.substring(0, length)}...${text.substring(text.length - length)}`;
    } else {
      return text;
    }
  }

  function findAncestor(el, sel) {
    while (el && !((el.matches || el.matchesSelector).call(el, sel))) {
      el = el.parentElement;
    }
    return el;
  }

  class ElementPicker {
    VERSION = "0.3.0";

    constructor(options) {
      // MUST create hover box first before applying options
      this.hoverBox = document.createElement("div");
      this.hoverBox.style.position = "absolute";
      // this.hoverBox.style.pointerEvents = "none";
      this.hoverBox.style.cursor = "crosshair";
      this.hoverBox.style.setProperty("z-index", 2147483647, "important");

      this._actionEvent = null;

      this.hoverBoxInfo = document.createElement("div");
      this.hoverInfo = {
        element: null,
        tagName: "",
        width: 0,
        height: 0,
      }
      this.hoverBoxInfo.innerText = "";
      this.hoverBoxInfo.style = `
        background-color: rgba(0,0,0,.5);
        border-radius: 0 0 0 0;
        bottom: 0;
        box-shadow: 0 0 1px 0 rgba(0,0,0,.16);
        box-sizing: border-box;
        color: #f1f3f4;
        font-family: Roboto-Medium,Roboto,arial,sans-serif;
        font-size: 10px;
        line-height: 10px;
        margin-left: 0;
        overflow: hidden;
        padding: 4px;
        padding-bottom: 2px;
        position: fixed;
        right: 0;
        white-space: nowrap;
        z-index: 2147483647 !important;
        pointer-events: none;
      `;

      const defaultOptions = {
        container: null, // if falsey an iframe will be used
        iFrameId: null, // only used if container is falsey to name the built iframe
        enabled: true,
        selectors: "*", // default to pick all elements
        background: "rgba(153, 235, 255, 0.5)", // transparent light blue
        borderWidth: 5,
        outlineColor: "rgba(153, 235, 255, 0.75)", // transparent light blue
        outlineWidth: 1,
        transition: "all 150ms ease", // set to "" (empty string) to disable
        ignoreElements: [document.body],
        action: {},
        hoverBoxInfoId: 'EP_hoverBoxInfo',
      }
      const mergedOptions = {
        ...defaultOptions,
        ...options
      };

      if (!mergedOptions.container) {
        let pickerIFrame = document.createElement('iframe');
        pickerIFrame.id = mergedOptions.iFrameId ?? 'picker_iframe';
        document.documentElement.append(pickerIFrame);

        const pickerIFrameCSS = `
          background: transparent !important;
          left: 0px;
          top: 0px;
          position: fixed;
          width: 100% !important;
          height: 100% !important;
          overflow: hidden;
          z-index: 2147483647 !important;
          margin: 0px;
          border: 0px;
          color-scheme: none;
        `;

        pickerIFrame.style = pickerIFrameCSS;
        pickerIFrame.contentDocument.body.style = pickerIFrameCSS;
        this.iframe = pickerIFrame;
        mergedOptions.container = pickerIFrame.contentDocument.body;
        mergedOptions.ignoreElements.push(pickerIFrame);
      }

      Object.keys(mergedOptions).forEach((key) => {
        this[key] = mergedOptions[key];
      });

      this._onScroll = (e) => {
        let fakeTarget = document.elementsFromPoint(this._lastClientX, this._lastClientY)[1];
        let fakeEvent = {
          clientX: this._lastClientX,
          clientY: this._lastClientY,
          target: fakeTarget,
        }
        this._detectMouseMove(fakeEvent);
      }

      this.trigger = (e) => {
        let target = this.hoverInfo?.element;
        let evt = this._actionEvent ?? e;
        // console.log("TRIGGERED", evt, target, this.action.callback);
        if (this.action.callback) {
          this.action.callback(evt, target);
          this._redetectMouseMove(); // call it again as the action may have altered the page
        }
        this._triggered = false;
        this._actionEvent = null;
      }

      this.getElementInfo = (target) => {
        const targetOffset = target.getBoundingClientRect();
        const targetHeight = targetOffset.height;
        const targetWidth = targetOffset.width;

        // need scrollX and scrollY to account for scrolling
        const top = (target.tagName === 'HTML' ? 0 : targetOffset.top) + (this.iframe ? 0 : window.scrollY);
        const left = (target.tagName === 'HTML' ? 0 : targetOffset.left) + (this.iframe ? 0 : window.scrollX);

        // const infoText = `${targetText} ${targetWidth} × ${targetHeight}`;
        const attrs = Array.from(target.attributes, ({
          name,
          value
        }) => (name + '=' + value));
        const ellipsizedAttrsText = attrs.length > 0 ? ' ' + ellipsize(attrs.join(' '), 20) : '';
        const infoText = `<${target.tagName.toUpperCase()}${ellipsizedAttrsText}> ${targetWidth} × ${targetHeight}`;

        let elementInfo = {
          element: target,
          tagName: target.tagName.toUpperCase(),
          width: targetWidth,
          height: targetHeight,
          targetOffsetTop: targetOffset.top,
          targetOffsetLeft: targetOffset.left,
          scrollX: window.scrollX,
          scrollY: window.scrollY,
          top: top, // targetOffset.top + window.scrollY,
          left: left, // targetOffset.left + window.scrollX,
          clientRect: targetOffset,
          text: infoText,
        }
        
        return elementInfo;
      }

      this.highlight = (target) => {
        this.hoverInfo = this.getElementInfo(target);
        const info = this.hoverInfo;
        
        this.hoverBox.style.width = info.width + this.borderWidth * 2 + "px";
        this.hoverBox.style.height = info.height + this.borderWidth * 2 + "px";

        this.hoverBox.style.outline = this.outlineWidth + "px solid " + this.outlineColor;

        // need scrollX and scrollY to account for scrolling
        this.hoverBox.style.top = info.top - this.borderWidth + "px";
        this.hoverBox.style.left = info.left - this.borderWidth + "px";

        this.hoverBoxInfo.innerText = info.text;

        // console.log(this.hoverInfo);
      }

      this._detectMouseMove = (e) => {
        this._lastClientX = e.clientX;
        this._lastClientY = e.clientY;
        if (!this.enabled) return;
        this._previousEvent = e;
        let target = e.target;
        // console.log("TCL: ElementPicker -> this._moveHoverBox -> target", target)
        if (!(this.ignoreElements.indexOf(target) >= 0) && target.matches(this.selectors)) { // is NOT in ignored elements
          // console.log("TCL: target", target);
          if (target === this.hoverBox || target === this.container) {
            // the truely hovered element behind the added hover box
            const hoveredElements = document.elementsFromPoint(e.clientX, e.clientY);
            let startIdx = 0;
            for (const [index, element] of hoveredElements.entries()) {
              if (element.matches('svg')) {
                startIdx = index;
                break;
              }
            }
            // console.log(hoveredElements);
            let hoveredElement = hoveredElements[startIdx];
            for (let i=startIdx; i < hoveredElements.length; i++) {
              hoveredElement = hoveredElements[i];
              if (((this.iframe && this.iframe.contains(hoveredElement)) || this.container.contains(hoveredElement))) {
                continue;
              } else {
                break;
              }
            }
            // console.log("screenX: " + e.screenX);
            // console.log("screenY: " + e.screenY);
            // console.log("TCL: hoveredElement", hoveredElement);
            /*if (!this._triggered && this._previousTarget === hoveredElement) {
                // avoid repeated calculation and rendering
                return;
            } else*/
            {
              target = hoveredElement;
            }
          } else {
            this._previousTarget = target;
          }
          this.highlight(target);

          if (this._triggered && this.action.callback) {
            // console.log("TRIGGERED");
            this.trigger(e);
          }
        } else {
          // console.log("hiding hover box...");
          this.hoverBox.style.width = 0;
        }
      };

    }
    
    get info() {
      return this.hoverInfo;
    }
    
    get hoverBoxInfoId() {
      return this.hoverBoxInfo.id;
    }
    set hoverBoxInfoId(value) {
      this.hoverBoxInfo.id = value;
    }
    
    get visible() {
      return this._visible;
    }
    set visible(value) {
      this._visible = value;

      this.hoverBox.style.visibility = this._visible ? "visible" : "hidden";
      this.hoverBoxInfo.style.visibility = this._visible ? "visible" : "hidden";
      this.container.style.visibility = this._visible ? "visible" : "hidden";
      if (this.iframe) {
        this.iframe.style.visibility = this._visible ? "visible" : "hidden";
        this.iframe.style.display = this._visible ? "block" : "none";
      }
      if (!this._visible) {
        this.hoverBox.style.width = 0;
        this.hoverBox.style.height = 0;
        this.hoverBoxInfo.innerText = '';
      }
    }
    
    get enabled() {
      return this._enabled;
    }
    set enabled(value) {
      this._enabled = value;
      this.visible = value;

      this._triggered = false;
      // console.log("set enabled:", this._enabled);
      if (!this._enabled) {
        if (this._triggerListener) {
          this.container.removeEventListener(this.action.trigger, this._triggerListener);
        }
        this.container.removeEventListener("mousemove", this._detectMouseMove);
        document.removeEventListener("scroll", this._onScroll);
        // console.log("remove listeners");
      } else {
        window.focus(); // ensure window is focused so it can listen to key events
        if (this.action?.trigger && this._triggerListener) {
          this.container.addEventListener(this.action.trigger, this._triggerListener);
        }
        this.container.addEventListener("mousemove", this._detectMouseMove);
        document.addEventListener("scroll", this._onScroll);
        // console.log("add listeners");
      }
    }
    
    get container() {
      return this._container;
    }
    set container(value) {
      if (value.appendChild) {
        this._container = value;
        this.container.appendChild(this.hoverBox);
        this.container.appendChild(this.hoverBoxInfo);
      } else {
        throw new Error("Please specify an HTMLElement as container!");
      }
    }
    
    get background() {
      return this._background;
    }
    set background(value) {
      this._background = value;

      this.hoverBox.style.background = this.background;
    }
    
    get outlineWidth() {
      return this._outlineWidth;
    }
    set outlineWidth(value) {
      this._outlineWidth = value;

      this._redetectMouseMove();
    }
    
    get transition() {
      return this._transition;
    }
    set transition(value) {
      this._transition = value;

      this.hoverBox.style.transition = this.transition;
    }
    
    get borderWidth() {
      return this._borderWidth;
    }
    set borderWidth(value) {
      this._borderWidth = value;

      this._redetectMouseMove();
    }
    
    get selectors() {
      return this._selectors;
    }
    set selectors(value) {
      this._selectors = value;

      this._redetectMouseMove();
    }
    
    get ignoreElements() {
      return this._ignoreElements;
    }
    set ignoreElements(value) {
      this._ignoreElements = value;

      this._redetectMouseMove();
    }
    
    get action() {
      return this._action;
    }
    set action(value) {
      if (value instanceof Object) {
        if (typeof value.trigger === "string" &&
          typeof value.callback === "function") {
          if (this._triggerListener) {
            this.container.removeEventListener(this.action.trigger, this._triggerListener);
            this._triggered = false;
            this._actionEvent = null;
          }
          this._action = value;

          this._triggerListener = (evt) => {
            this._actionEvent = evt;
            this._triggered = true;
            this._redetectMouseMove();
          }
          this.container.addEventListener(this.action.trigger, this._triggerListener);
        } else if (value.trigger !== undefined || value.callback !== undefined) { // allow empty action object
          throw new Error("action must include two keys: trigger (String) and callback (function)!");
        }
      } else {
        throw new Error("action must be an object!");
      }
    }
    close() {
      if (this._triggerListener) {
        this.container.removeEventListener(this.action.trigger, this._triggerListener);
      }
      this.container.removeEventListener("mousemove", this._detectMouseMove);
      document.removeEventListener("scroll", this._onScroll);
      this.hoverBox.remove();
      this.hoverBoxInfo.remove();
      if (this.iframe) {
        this.iframe.remove();
      }
    }
    _redetectMouseMove() {
      if (this._detectMouseMove && this._previousEvent) {
        this._detectMouseMove(this._previousEvent);
      }
    }
  }
  
  // export module
  if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
    module.exports = ElementPicker;
  } else {
    window.ElementPicker = ElementPicker;
  }
  
})();