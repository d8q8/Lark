//////////////////////////////////////////////////////////////////////////////////////
//
//  Copyright (c) 2014-2015, Egret Technology Inc.
//  All rights reserved.
//  Redistribution and use in source and binary forms, with or without
//  modification, are permitted provided that the following conditions are met:
//
//     * Redistributions of source code must retain the above copyright
//       notice, this list of conditions and the following disclaimer.
//     * Redistributions in binary form must reproduce the above copyright
//       notice, this list of conditions and the following disclaimer in the
//       documentation and/or other materials provided with the distribution.
//     * Neither the name of the Egret nor the
//       names of its contributors may be used to endorse or promote products
//       derived from this software without specific prior written permission.
//
//  THIS SOFTWARE IS PROVIDED BY EGRET AND CONTRIBUTORS "AS IS" AND ANY EXPRESS
//  OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES
//  OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED.
//  IN NO EVENT SHALL EGRET AND CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT,
//  INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
//  LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;LOSS OF USE, DATA,
//  OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF
//  LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
//  NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE,
//  EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
//
//////////////////////////////////////////////////////////////////////////////////////

module lark.web {

    /**
     * Canvas屏幕渲染器
     */
    export class ScreenRenderer extends HashObject implements lark.player.IScreenRenderer {
        /**
         * 创建一个Canvas屏幕渲染器
         */
        public constructor(canvas:HTMLCanvasElement) {
            super();
            if (canvas) {
                this.canvas = canvas;
                this.context = canvas.getContext("2d");
                this.renderContext = this.createRenderContext(this.context);
            }

            if (DEBUG) {//显示重绘区相关代码，发行版中移除
                /**
                 * 绘制一个脏矩形显示区域，在显示重绘区功能开启时调用。
                 */
                this.drawDirtyRect = function (x:number, y:number, width:number, height:number):void {
                    var context = this.context;
                    context.strokeStyle = 'red';
                    context.lineWidth = 1;
                    context.strokeRect(x - 0.5, y - 0.5, width, height);
                }
            }
        }

        /**
         * 绘制一个脏矩形显示区域，在显示重绘区功能开启时调用。
         */
        public drawDirtyRect:(x:number, y:number, width:number, height:number)=>void;

        protected canvas:HTMLCanvasElement;
        protected context:CanvasRenderingContext2D;
        public renderContext:player.ScreenRenderContext;

        /**
         * 绘制脏矩形列表
         */
        public markDirtyRects(regionList:lark.player.Region[]):void {
            var context = this.context;
            context.save();
            context.beginPath();
            var length = regionList.length;
            for (var i = 0; i < length; i++) {
                var region = regionList[i];
                context.clearRect(region.minX, region.minY, region.width, region.height);
                context.rect(region.minX, region.minY, region.width, region.height);
            }
            context.clip();
        }

        /**
         * 移除之前绘制的脏矩形区域
         */
        public removeDirtyRects():void {
            this.context.restore();
        }

        /**
         * 清空屏幕
         */
        public clearScreen():void {
            var context = this.context;
            context.save();
            context.setTransform(1, 0, 0, 1, 0, 0);
            context.clearRect(0, 0, this.canvas.width, this.canvas.height);
            context.restore();
        }

        public reset(root:DisplayObject):void {
        }

        private createRenderContext(context:CanvasRenderingContext2D):player.ScreenRenderContext {

            context["drawTexture"] = function (texture:Texture):void {
                var width = texture.$bitmapWidth;
                var height = texture.$bitmapHeight;
                if (width === 0 || height === 0) {
                    return;
                }
                context.drawImage(texture.$bitmapData, texture.$bitmapX, texture.$bitmapY, width, height,
                    texture.$offsetX, texture.$offsetY, width, height);
            };
            context["setMatrix"] = function (matrix:Matrix):void {
                var m = matrix.$data;
                context.transform(m[0], m[1], m[2], m[3], m[4], m[5]);
            };

            if (!context.hasOwnProperty("imageSmoothingEnabled")) {
                var keys = ["webkitImageSmoothingEnabled", "mozImageSmoothingEnabled", "msImageSmoothingEnabled"];
                for (var i = keys.length - 1; i >= 0; i--) {
                    var key = keys[i];
                    if (context.hasOwnProperty(key)) {
                        break;
                    }
                }
                Object.defineProperty(context, "imageSmoothingEnabled", {
                    get: function () {
                        return this[key];
                    },
                    set: function (value) {
                        this[key] = value;
                    }
                });
            }
            return <player.ScreenRenderContext><any>context;
        }
    }

}