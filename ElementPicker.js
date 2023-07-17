(function () {
    class ElementPicker {
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
            // document.styleSheets[0].insertRule('#EP_hoverBoxInfo:empty { display: none;}', 0); // hide when empty
            // ↑ done in CSS
            this.hoverBoxInfo.style = 
              `background-color: rgba(0,0,0,.5);
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
              z-index: 2147483647 !important`;
    
            const defaultOptions = {
                container: document.body,
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
            Object.keys(mergedOptions).forEach((key) => {
                this[key] = mergedOptions[key];
            });

            this._detectMouseMove = (e) => {
                if (!this.enabled) return;
                this._previousEvent = e;
                let target = e.target;
                // console.log("TCL: ElementPicker -> this._moveHoverBox -> target", target)
                if (this.ignoreElements.indexOf(target) === -1 && target.matches(this.selectors) &&
                    this.container.contains(target) ||
                    target === this.hoverBox) { // is NOT ignored elements
                    // console.log("TCL: target", target);
                    if (target === this.hoverBox) {
                        // the truely hovered element behind the added hover box
                        const hoveredElement = document.elementsFromPoint(e.clientX, e.clientY)[1];
                        // console.log("screenX: " + e.screenX);
                        // console.log("screenY: " + e.screenY);
                        // console.log("TCL: hoveredElement", hoveredElement);
                        if (!this._triggered && this._previousTarget === hoveredElement) {
                            // avoid repeated calculation and rendering
                            return;
                        } else {
                            target = hoveredElement;
                        }
                    } else {
                        this._previousTarget = target;
                    }
                    const targetOffset = target.getBoundingClientRect();
                    const targetHeight = targetOffset.height;
                    const targetWidth = targetOffset.width;

                    this.hoverBox.style.width = targetWidth + this.borderWidth * 2 + "px";
                    this.hoverBox.style.height = targetHeight + this.borderWidth * 2 + "px";
                    
                    this.hoverBox.style.outline = this.outlineWidth + "px solid " + this.outlineColor;
                    
                    // need scrollX and scrollY to account for scrolling
                    this.hoverBox.style.top = targetOffset.top + window.scrollY - this.borderWidth + "px";
                    this.hoverBox.style.left = targetOffset.left + window.scrollX - this.borderWidth + "px";

                    const infoText = `<${target.tagName.toUpperCase()}> ${targetWidth} × ${targetHeight}`;
                    this.hoverBoxInfo.innerText = infoText;

                    this.hoverInfo = {
                      element: target,
                      tagName: target.tagName.toUpperCase(),
                      width: targetWidth,
                      height: targetHeight,
                      targetOffsetTop: targetOffset.top,
                      targetOffsetLeft: targetOffset.left,
                      scrollX: window.scrollX,
                      scrollY: window.scrollY,
                      top: targetOffset.top + window.scrollY,
                      left: targetOffset.left + window.scrollX,
                      clientRect: targetOffset,
                      text: infoText,
                    }

                    if (this._triggered && this.action.callback) {
                        // console.log("TRIGGERED");
                        this.action.callback(this._actionEvent, target);
                        this._triggered = false;
                        this._actionEvent = null;
                    }
                } else {
                    // console.log("hiding hover box...");
                    this.hoverBox.style.width = 0;
                }
            };
            
            // document.addEventListener("mousemove", this._detectMouseMove);
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
        get enabled() {
            return this._enabled;
        }
        set enabled(value) {
            this._enabled = value;
            this.hoverBox.style.visibility = this._enabled ? "visible" : "hidden";
            this.hoverBoxInfo.style.visibility = this._enabled ? "visible" : "hidden";
            this._triggered = false;
            if (!this._enabled) {
              this.hoverBox.style.width = 0;
              this.hoverBox.style.height = 0;
              this.hoverBoxInfo.innerText = '';
              if (this._triggerListener) {
                document.removeEventListener(this.action.trigger, this._triggerListener);
              }
              document.removeEventListener("mousemove", this._detectMouseMove);
            } else {
              if (this.action?.trigger && this._triggerListener) {
                document.addEventListener(this.action.trigger, this._triggerListener);
              }
              document.addEventListener("mousemove", this._detectMouseMove);
            }
        }
        get container() {
            return this._container;
        }
        set container(value) {
            if (value instanceof HTMLElement) {
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
                        document.removeEventListener(this.action.trigger, this._triggerListener);
                        this._triggered = false;
                        this._actionEvent = null;
                    }
                    this._action = value;

                    this._triggerListener = (evt) => {
                        this._actionEvent = evt;
                        this._triggered = true;
                        this._redetectMouseMove();
                        if (this.action?.callback) {
                          this._redetectMouseMove(); // call it again as the action may have altered the page
                        }
                    }
                    document.addEventListener(this.action.trigger, this._triggerListener);
                } else if (value.trigger !== undefined || value.callback !== undefined){ // allow empty action object
                    throw new Error("action must include two keys: trigger (String) and callback (function)!");
                }
            } else {
                throw new Error("action must be an object!");
            }
        }
        close() {
            if (this._triggerListener) {
              document.removeEventListener(this.action.trigger, this._triggerListener);
            }
            document.removeEventListener("mousemove", this._detectMouseMove);
            this.hoverBox.remove();
            this.hoverBoxInfo.remove();
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
