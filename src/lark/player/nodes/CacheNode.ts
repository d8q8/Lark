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

module lark.player {

    export var $cacheNodePool:ICacheNodePool;

    var regionPool:Region[] = [];

    /**
     * 从对象池取出或创建一个新的Region实例。
     */
    function getRegion(minX:number, minY:number, maxX:number, maxY:number, screenRegion:Region):Region {
        var region:Region = regionPool.pop();
        if (!region) {
            region = new Region();
        }
        if (screenRegion) {
            if (minX < screenRegion.minX) {
                minX = screenRegion.minX;
            }
            if (minY < screenRegion.minY) {
                minY < screenRegion.minY;
            }
            if (maxX > screenRegion.maxX) {
                maxX = screenRegion.maxX;
            }
            if (maxY > screenRegion.maxY) {
                maxY = screenRegion.maxY;
            }
        }
        return region.setTo(minX, minY, maxX, maxY);
    }


    export class CacheNode extends BitmapNode {

        public needRedraw:boolean = false;

        public renderer:IScreenRenderer = null;

        public screenRegion:Region = null;
        /**
         * 显示对象的渲染节点发生改变时，把自身的RenderNode对象注册到此列表上。
         */
        private dirtyNodes:any = {};

        public dirtyList:Region[] = [];

        public markDirty(node:RenderNode):void {
            this.dirtyNodes[node.$hashCode] = node;
            if (!this.needRedraw) {
                this.needRedraw = true;
                var parentCache = this.target.$parentCacheNode;
                if (parentCache) {
                    parentCache.markDirty(this);
                }
            }
        }

        public updateDirtyNodes():Region[] {
            var nodeList = this.dirtyNodes;
            this.dirtyNodes = {};
            var dirtyList = this.dirtyList;
            for (var i in nodeList) {
                var node = nodeList[i];
                if (node.alpha !== 0) {
                    var region = getRegion(node.minX, node.minY, node.maxX, node.maxY,this.screenRegion);
                    if(region.area>0){
                        node.isDirty = true;
                        dirtyList.push(region);
                        this.mergeDirtyList(dirtyList);
                    }
                }
                node.update();
                if (node.moved && node.alpha !== 0) {
                    var region = getRegion(node.minX, node.minY, node.maxX, node.maxY,this.screenRegion);
                    if(region.area>0){
                        node.isDirty = true;
                        dirtyList.push(region);
                        this.mergeDirtyList(dirtyList);
                    }
                }
            }
            return dirtyList;
        }

        /**
         * 结束重绘,清理缓存。
         */
        public cleanCache():void {
            var dirtyList = this.dirtyList;
            var length = dirtyList.length;
            for (var i = 0; i < length; i++) {
                regionPool.push(dirtyList[i]);
            }
            this.dirtyList = [];
            this.needRedraw = false;
        }

        /**
         * 合并脏矩形列表
         */
        private mergeDirtyList(dirtyList:Region[]):void {
            var length = dirtyList.length;
            if (length < 2) {
                return;
            }
            var bestDelta = length > 3 ? Number.POSITIVE_INFINITY : 0;
            var mergeA = 0;
            var mergeB = 0;
            for (var i = 0; i < length - 1; i++) {
                for (var j = i + 1; j < length; j++) {
                    var regionA = dirtyList[i];
                    var regionB = dirtyList[j];
                    var delta = this.unionArea(regionA, regionB) - regionA.area - regionB.area;
                    if (bestDelta > delta) {
                        mergeA = i;
                        mergeB = j;
                        bestDelta = delta;
                    }
                }
            }
            if (mergeA != mergeB) {
                dirtyList[mergeA].union(dirtyList[mergeB]);
                regionPool.push(dirtyList[mergeB]);
                dirtyList.splice(mergeB, 1);
                this.mergeDirtyList(dirtyList);
            }
        }

        private unionArea(r1:Region, r2:Region):number {
            var minX = r1.minX < r2.minX ? r1.minX : r2.minX;
            var minY = r1.minX < r2.minY ? r1.minX : r2.minY;
            var maxX = r1.maxX > r2.maxX ? r1.maxX : r2.maxX;
            var maxY = r1.maxY > r2.maxY ? r1.maxY : r2.maxY;
            return (maxX - minX) * (maxY - minY);
        }

        public update():void {
            var target = this.target;
            target.$removeFlagsUp(DisplayObjectFlags.Dirty);
            this.matrix = target.$getConcatenatedMatrix();
            this.bounds = target.$getOriginalBounds();
            this.updateBounds();
            if (this.needRedraw) {
                this.updateDirtyNodes();
            }
        }
    }

    export class Region {

        public constructor() {

        }

        public minX:number = 0;
        public minY:number = 0;
        public maxX:number = 0;
        public maxY:number = 0;

        public width:number = 0;
        public height:number = 0;
        public area:number = 0;

        public setTo(minX:number, minY:number, maxX:number, maxY:number):Region {
            this.minX = minX;
            this.minY = minY;
            this.maxX = maxX;
            this.maxY = maxY;
            this.updateArea();
            return this;
        }

        public updateArea():void {
            this.width = this.maxX - this.minX;
            this.height = this.maxY - this.minY;
            this.area = this.width * this.height;
        }

        public union(target:Region):void {
            if (this.minX > target.minX) {
                this.minX = target.minX;
            }
            if (this.minY > target.minY) {
                this.minY = target.minY;
            }
            if (this.maxX < target.maxX) {
                this.maxX = target.maxX;
            }
            if (this.maxY < target.maxY) {
                this.maxY = target.maxY;
            }
            this.updateArea();
        }
    }
}
