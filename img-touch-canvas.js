/*
=================================
img-touch-canvas - v0.1
http://github.com/rombdn/img-touch-canvas

(c) 2013 Romain BEAUDON
This code may be freely distributed under the MIT License
=================================
*/


(function() {
    var root = this; //global object

    var ImgTouchCanvas = function(options) {
        if( !options || !options.canvas || !options.path) {
            throw 'ImgZoom constructor: missing arguments canvas or path';
        }

        this.canvas         = options.canvas;
        this.canvas.width   = this.canvas.clientWidth;
        this.canvas.height  = this.canvas.clientHeight;
        this.context        = this.canvas.getContext('2d');

        this.desktop = options.desktop || false; //non touch events
        
        this.position = {
            x: 0,
            y: 0
        };
        this.scale = {
            x: 0.5,
            y: 0.5
        };
        this.imgTexture = new Image();
        this.imgTexture.src = options.path;

        this.lastZoomScale = null;
        this.lastX = null;
        this.lastY = null;

        this.mdown = false; //desktop drag

        this.init = false;
        this.checkRequestAnimationFrame();
        this.rafId = requestAnimationFrame(this.animate.bind(this));


        this.setEventListeners();
    };


    ImgTouchCanvas.prototype = {
        initImg: function() {
            var scaleRatio = 1;
            if (this.imgTexture.width > this.canvas.clientWidth) {
                scaleRatio = this.canvas.clientWidth / this.imgTexture.width;
            } 
            if (this.imgTexture.height * scaleRatio > this.canvas.clientHeight) {
                scaleRatio = this.canvas.clientHeight / this.imgTexture.height;
            }

            this.scale.x = scaleRatio;
            this.scale.y = scaleRatio;
            this.position.x = (this.canvas.clientWidth - (this.imgTexture.width * scaleRatio)) / 2;
            this.position.y = (this.canvas.clientHeight - (this.imgTexture.height * scaleRatio)) / 2;
        },
        animate: function() {
            //set scale such as image cover all the canvas
            if(!this.init) {
                if(this.imgTexture.width) {
                    this.initImg();
                    this.init = true;
                }
            }

            this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);

            this.context.drawImage(
                this.imgTexture, 
                this.position.x, this.position.y, 
                this.scale.x * this.imgTexture.width, 
                this.scale.y * this.imgTexture.height);

            this.rafId = requestAnimationFrame(this.animate.bind(this));
        },


        gesturePinchZoom: function(event) {
            var zoom = false;

            if( event.targetTouches.length >= 2 ) {
                var p1 = event.targetTouches[0];
                var p2 = event.targetTouches[1];
                var zoomScale = Math.sqrt(Math.pow(p2.pageX - p1.pageX, 2) + Math.pow(p2.pageY - p1.pageY, 2)); //euclidian distance

                if( this.lastZoomScale ) {
                    zoom = zoomScale - this.lastZoomScale;
                }

                this.lastZoomScale = zoomScale;
            }    

            return zoom;
        },

        doZoom: function(zoom) {
            if(!zoom) return;

            //new scale
            var currentScale = this.scale.x;
            var newScale = this.scale.x + zoom/200;
            document.getElementById('overlay_bottom').innerHTML = newScale;
            if (newScale <= 0.1) return;

            //some helpers
            var deltaScale = newScale - currentScale;
            var currentWidth    = (this.imgTexture.width * this.scale.x);
            var currentHeight   = (this.imgTexture.height * this.scale.y);
            var deltaWidth  = this.imgTexture.width*deltaScale;
            var deltaHeight = this.imgTexture.height*deltaScale;


            //by default scale doesnt change position and only add/remove pixel to right and bottom
            //so we must move the image to the left to keep the image centered
            //ex: coefX and coefY = 0.5 when image is centered <=> move image to the left 0.5x pixels added to the right
            var canvasmiddleX = this.canvas.clientWidth / 2;
            var canvasmiddleY = this.canvas.clientHeight / 2;
            var xonmap = (-this.position.x) + canvasmiddleX;
            var yonmap = (-this.position.y) + canvasmiddleY;
            var coefX = -xonmap / (currentWidth);
            var coefY = -yonmap / (currentHeight);
            var newPosX = this.position.x + deltaWidth*coefX;
            var newPosY = this.position.y + deltaHeight*coefY;

            //edges cases
            var newWidth = currentWidth + deltaWidth;
            var newHeight = currentHeight + deltaHeight;

            // if( newWidth < this.canvas.clientWidth ) {
            //     return;
            // }
            // if( newPosX > 0 ) { newPosX = 0; }
            // if( newPosX + newWidth < this.canvas.clientWidth ) { newPosX = this.canvas.clientWidth - newWidth;}
            
            // if( newHeight < this.canvas.clientHeight ) return;
            // if( newPosY > 0 ) { newPosY = 0; }
            // if( newPosY + newHeight < this.canvas.clientHeight ) { newPosY = this.canvas.clientHeight - newHeight; }


            //finally affectations
            this.scale.x    = newScale;
            this.scale.y    = newScale;
            this.position.x = newPosX;
            this.position.y = newPosY;
        },

        doMove: function(relativeX, relativeY) {
            if(this.lastX && this.lastY) {
              var deltaX = relativeX - this.lastX;
              var deltaY = relativeY - this.lastY;
              var currentWidth = (this.imgTexture.width * this.scale.x);
              var currentHeight = (this.imgTexture.height * this.scale.y);

              this.position.x += deltaX;
              this.position.y += deltaY;


              //edge cases
              // if( this.position.x > 0 ) {
              //   this.position.x = 0;
              // }
              // else if( this.position.x + currentWidth < this.canvas.clientWidth ) {
              //   this.position.x = this.canvas.clientWidth - currentWidth;
              // }
              // if( this.position.y > 0 ) {
              //   this.position.y = 0;
              // }
              // else if( this.position.y + currentHeight < this.canvas.clientHeight ) {
              //   this.position.y = this.canvas.clientHeight - currentHeight;
              // }
            }

            this.lastX = relativeX;
            this.lastY = relativeY;
        },

        setEventListeners: function() {
            // touch
            this.canvas.addEventListener('touchstart', function(e) {
                this.lastX          = null;
                this.lastY          = null;
                this.lastZoomScale  = null;
            }.bind(this));

            this.canvas.addEventListener('touchmove', function(e) {
                e.preventDefault();

                if(e.targetTouches.length == 2) { //pinch
                    this.doZoom(this.gesturePinchZoom(e));
                }
                else if(e.targetTouches.length == 1) {
                    var relativeX = e.targetTouches[0].pageX - this.canvas.getBoundingClientRect().left;
                    var relativeY = e.targetTouches[0].pageY - this.canvas.getBoundingClientRect().top;                
                    this.doMove(relativeX, relativeY);
                }
            }.bind(this));

            if(this.desktop) {
                // keyboard+mouse
                window.addEventListener('keyup', function(e) {
                    if(e.keyCode == 187 || e.keyCode == 61) { //+
                        this.doZoom(5);
                    }
                    else if(e.keyCode == 54) {//-
                        this.doZoom(-5);
                    }
                }.bind(this));

                window.addEventListener('mousedown', function(e) {
                    this.mdown = true;
                    this.lastX = null;
                    this.lastY = null;
                }.bind(this));

                window.addEventListener('mouseup', function(e) {
                    this.mdown = false;
                }.bind(this));

                window.addEventListener('mousemove', function(e) {
                    var relativeX = e.pageX - this.canvas.getBoundingClientRect().left;
                    var relativeY = e.pageY - this.canvas.getBoundingClientRect().top;

                    if(e.target == this.canvas && this.mdown) {
                        this.doMove(relativeX, relativeY);
                    }

                    if(relativeX <= 0 || relativeX >= this.canvas.clientWidth || relativeY <= 0 || relativeY >= this.canvas.clientHeight) {
                        this.mdown = false;
                    }
                }.bind(this));
            }
        },

        checkRequestAnimationFrame: function() {
            var lastTime = 0;
            var vendors = ['ms', 'moz', 'webkit', 'o'];
            for(var x = 0; x < vendors.length && !window.requestAnimationFrame; ++x) {
                window.requestAnimationFrame = window[vendors[x]+'RequestAnimationFrame'];
                window.cancelAnimationFrame = 
                  window[vendors[x]+'CancelAnimationFrame'] || window[vendors[x]+'CancelRequestAnimationFrame'];
            }

            if (!window.requestAnimationFrame) {
                window.requestAnimationFrame = function(callback, element) {
                    var currTime = new Date().getTime();
                    var timeToCall = Math.max(0, 16 - (currTime - lastTime));
                    var id = window.setTimeout(function() { callback(currTime + timeToCall); }, 
                      timeToCall);
                    lastTime = currTime + timeToCall;
                    return id;
                };
            }

            if (!window.cancelAnimationFrame) {
                window.cancelAnimationFrame = function(id) {
                    clearTimeout(id);
                };
            }
        },
        crop: function() {
            var cropCanvas, 
                $overlay = document.getElementById('overlay'),
            left = $overlay.getBoundingClientRect().left - this.position.x,
            top =  $overlay.getBoundingClientRect().top - this.position.y,
            width = $overlay.getBoundingClientRect().width,
            height = $overlay.getBoundingClientRect().height;
            window.cancelAnimationFrame(this.rafId);
            this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
            this.context.drawImage(this.imgTexture, left / this.scale.x, top / this.scale.y, width / this.scale.x, height / this.scale.y, $overlay.getBoundingClientRect().left, 
                $overlay.getBoundingClientRect().top, width, height);
            cropCanvas = document.createElement('canvas');
            cropCanvas.width = width;
            cropCanvas.height = height;
            var overlayLeft = $overlay.getBoundingClientRect().left,
            overlayTop =  $overlay.getBoundingClientRect().top,
            overlayRight = $overlay.getBoundingClientRect().left + $overlay.getBoundingClientRect().width ,
            overlayBottom = $overlay.getBoundingClientRect().top + $overlay.getBoundingClientRect().height;
            var cropedX1 = this.position.x <= overlayLeft ? overlayLeft : this.position.x,
                cropedX2 = this.position.x + this.imgTexture.width * this.scale.x <= overlayRight ? this.position.x + this.imgTexture.width * this.scale.x : overlayRight,
                cropedY1 = this.position.y <= overlayTop ? overlayTop : this.position.y,
                cropedY2 = this.position.y + this.imgTexture.height * this.scale.y <= overlayBottom ?  this.position.y + this.imgTexture.height * this.scale.y : overlayBottom;
            var cropedWidth = (cropedX2 - cropedX1),
                cropedHeight = (cropedY2 - cropedY1) ;
            var cropedImgLeft =  this.position.x < overlayLeft ? overlayLeft - this.position.x : 0,
                cropedImgTop =  this.position.y < overlayTop ? overlayTop - this.position.y : 0;
            cropCanvas.getContext('2d').drawImage(this.imgTexture, cropedImgLeft / this.scale.x, cropedImgTop / this.scale.y, cropedWidth / this.scale.x, cropedHeight / this.scale.y, cropedX1 - overlayLeft, cropedY1 - overlayTop, cropedWidth, cropedHeight);
            var c = cropCanvas.toDataURL('image/png', 1.0);
            document.body.innerHTML = '<img src=' + cropCanvas.toDataURL('image/png', 1.0) + '>';
        }
    };

    root.ImgTouchCanvas = ImgTouchCanvas;
}).call(this);
