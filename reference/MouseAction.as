/**
* @mouseActions : onMouseDown,onMouseStartMove,onMouseMove,onMouseUp,onClick,onLongClick,onMouseOut,onMouseOver
* @author kenefe kenefe.li@gmail.com
* @version 4.5
*/
package com.kenefe {
	import flash.display.*;
	import flash.events.*;
	import flash.text.*;
	import flash.utils.*;
	import flash.system.System;
	import com.kenefe.folme.*;

	public class MouseAction extends MovieClip{

		//对象
		var target = new MovieClip();

		//mouseDown坐标
		var _startX = 0;
		var _startY = 0;

		var _stage = new MovieClip();

		//判断的时长
		var _startTime = 0;
		var _judgeClickTime = 400;
		var _judgeLongClickTime = 400;
		var _judgeClickDistance = 30;
		var _judgeStartMoveDistance = 30;

		var _preventDefaultEvent = true;

		//本次触摸的信息
		var touchInfo = {
			isClick:false,
			hasLongClick:false,
			hasDown:false,
			hasMove:false,
			hasUp:false,
			direction:undefined,
			directionPositive:undefined,
			latestMouseEvent:undefined,
			mouseDownTime:undefined,
			mouseUpDirection:0,
			history:[],
			speed:{
				x:0,
				y:0
			}
		}

		// 获得MouseX,MouseY的方式
		var getMouseX = function(){return Folme.getMouseX() || 0;}
		var getMouseY = function(){return Folme.getMouseY() || 0;}

		// 暴露的Function
		public var mouseDownFunction = function(){}
		public var mouseMoveFunction = function(){}
		public var mouseMovingFunction = function(){}
		public var mouseStartMoveFunction = function(){}
		public var mouseUpFunction = function(){}
		public var mouseUpInsideFunction = function(){}
		public var mouseUpOutsideFunction = function(){}
		public var mouseEndMoveFunction = function(){}
		public var mouseOverFunction = function(){}
		public var mouseOutFunction = function(){}
		public var clickFunction = function(){}
		public var longClickFunction = function(){}

		//初始化
		public function MouseAction(json = undefined){
			json = json || {};
			
			if(!json.target)return;
			target = json.target;
			//trace('stage:',_stage);

			_stage = json.stage || Folme.getStage() || _stage;
			// getMouseX = function(){return _stage && _stage.mouseX;};
			// getMouseY = function(){return _stage && _stage.mouseY;};
			getMouseX = json.mouseX || getMouseX;
			getMouseY = json.mouseY || getMouseY;

			_judgeClickTime = json.judgeClickTime || _judgeClickTime;
			_judgeLongClickTime = json.judgeLongClickTime || _judgeLongClickTime;
			_judgeClickDistance = json.judgeClickDistance || _judgeClickDistance;
			_judgeStartMoveDistance = json.judgeStartMoveDistance || _judgeStartMoveDistance;

			if(json.preventEvent != undefined) _preventDefaultEvent = json.preventEvent;

			mouseDownFunction = json.onMouseDown || function(t){};
			mouseStartMoveFunction = json.onMouseStartMove || function(t){};
			mouseMoveFunction = json.onMouseMove || function(t){};
			mouseMovingFunction = json.onMouseMoving || function(t){};
			mouseUpFunction = json.onMouseUp || function(t){};
			mouseUpInsideFunction = json.onMouseUpInside || function(t){};
			mouseUpOutsideFunction = json.onMouseUpOutside || function(t){};
			mouseEndMoveFunction = json.onMouseEndMove || function(t){};
			clickFunction = json.onClick || function(t){};
			longClickFunction = json.onLongClick || function(t){};
			mouseOverFunction = json.onMouseOver || function(t){};
			mouseOutFunction = json.onMouseOut || function(t){};

			target.addEventListener(MouseEvent.MOUSE_DOWN,mouseDown)
			target.addEventListener(MouseEvent.MOUSE_OVER,mouseOver)
			target.addEventListener(MouseEvent.MOUSE_OUT,mouseOut)

			//addEventListener(Event.ADDED_TO_STAGE, stageAddHandler);
		}

		public function get doMouseDown(){
			return mouseDownFunction;
		}
		public function get doMouseStartMove(){
			return mouseStartMoveFunction;
		}
		public function get doMouseMove(){
			return mouseMoveFunction;
		}
		public function get doMouseMoving(){
			return mouseMovingFunction;
		}
		public function get doMouseUp(){
			return mouseUpFunction;
		}
		public function get doMouseUpInside(){
			return mouseUpInsideFunction;
		}
		public function get doMouseUpOutside(){
			return mouseUpFunction;
		}
		public function get doMouseEndMove(){
			return mouseEndMoveFunction;
		}
		public function get doClick(){
			return clickFunction;
		}
		public function get doLongClick(){
			return longClickFunction;
		}
		public function get doMouseOver(){
			return mouseOverFunction;
		}
		public function get doMouseOut(){
			return mouseOutFunction;
		}



		/*
		private function stageAddHandler(e){
			_stage = this.stage;
			trace('_stage:',_stage);
 			removeEventListener(Event.ADDED_TO_STAGE, stageAddHandler);
		}
		*/

		private function mouseDown(e:MouseEvent){

			if(_preventDefaultEvent) e.stopPropagation();
			
			_startTime = getTimer();
			_startX = getMouseX();
			_startY = getMouseY();

			touchInfo.mouseDownX = _startX;
			touchInfo.mouseDownY = _startY;
			touchInfo.mouseUpX = undefined;
			touchInfo.mouseUpY = undefined;
			touchInfo.offsetX = 0;
			touchInfo.offsetY = 0;
			touchInfo.hasDown = true;
			touchInfo.hasUp = false;
			touchInfo.hasLongClick = false;
			touchInfo.isClick = false;
			touchInfo.direction = undefined;
			touchInfo.hasMove = false;
			touchInfo.latestMouseEvent = e;
			touchInfo.mouseDownTime = _getCurrentTime();
			touchInfo.mouseUpDirection = 0;
			touchInfo.directionAngle = 0;
			touchInfo.history = [];
			touchInfo.history.push({
				x:_startX,
				y:_startY,
				time:_getCurrentTime()
			})
			touchInfo.speed = {
				x:0,
				y:0,
				total:0
			}

			//暴露onMouseDown
			mouseDownFunction(e,touchInfo);

			_stage.addEventListener(MouseEvent.MOUSE_MOVE,mouseStartMove);
			_stage.addEventListener(MouseEvent.MOUSE_MOVE,mouseMove);
			target.addEventListener(MouseEvent.MOUSE_UP,mouseUp);
			target.addEventListener(MouseEvent.RELEASE_OUTSIDE,mouseUpOutside);
			_stage.addEventListener(Event.ENTER_FRAME,waitingForLongClick);
			_stage.addEventListener(Event.ENTER_FRAME,mouseDown2Up);
		}

		private function mouseDown2Up(e:Event){
			if(_preventDefaultEvent) e.stopPropagation();
			pushHistory(getMouseX(),getMouseY());
			
			// 暴露onMouseMoving
			mouseMovingFunction(e,touchInfo);
		}

		private function mouseStartMove(e:MouseEvent){
			if(_preventDefaultEvent) e.stopPropagation();

			var dx = getMouseX()-_startX;
			var dy = getMouseY()-_startY;			

			//判断是否第一次Move
			if(_calDis(dx,dy)>_judgeStartMoveDistance){
				touchInfo.hasMove = true;
				touchInfo.direction = Math.abs(dx)>Math.abs(dy);//是不是横的
				touchInfo.whichDirect = touchInfo.direction?dx>0:dy>0;//是不是正方向
				
				//暴露onStartMove
				mouseStartMoveFunction(e,touchInfo);

				_stage.removeEventListener(Event.ENTER_FRAME,waitingForLongClick);
				_stage.removeEventListener(MouseEvent.MOUSE_MOVE,mouseStartMove);
			}	
		}

		private function mouseMove(e:MouseEvent){
			if(_preventDefaultEvent) e.stopPropagation();
			touchInfo.latestMouseEvent = e;

			//暴露onMouseMove
			mouseMoveFunction(e,touchInfo);
		}

		private function pushHistory(x,y){
			
			var lastTime = _getCurrentTime();
			var lastX = x;
			var lastY = y;

			touchInfo.history.push({
				x:lastX,
				y:lastY,
				time:lastTime
			})
			
			while(touchInfo.history.length>50){
				touchInfo.history.shift();
			}

			touchInfo.speed = {x:null,y:null};
			if(touchInfo.history.length>=2){

				lastTime = touchInfo.history[touchInfo.history.length-1].time;
                var lastValueX = touchInfo.history[touchInfo.history.length-1].x;
				var lastValueY = touchInfo.history[touchInfo.history.length-1].y;

                var lastTime1 = touchInfo.history[touchInfo.history.length-2].time;
                var lastValue1X = touchInfo.history[touchInfo.history.length-2].x;
				var lastValue1Y = touchInfo.history[touchInfo.history.length-2].y;

				var tmp1X = (lastValueX - lastValue1X) / ((lastTime - lastTime1)/1000);
                var tmp1Y = (lastValueY - lastValue1Y) / ((lastTime - lastTime1)/1000);


				for(var i=touchInfo.history.length-1;i>=0;i--){
					var tInfo = touchInfo.history[i];
					var dt = lastTime - tInfo.time;
					if(dt>30 && dt<100){

						var tmp2X = (lastValueX-tInfo.x) / (dt/1000);
						var tmp2Y = (lastValueY-tInfo.y) / (dt/1000);

						touchInfo.speed.x = tmp2X;
						touchInfo.speed.y = tmp2Y;

						if(tmp1X*tmp2X>0){
							if(tmp2X>0)touchInfo.speed.x = Math.max(tmp1X,tmp2X);
							else if(tmp2X<0)touchInfo.speed.x = Math.min(tmp1X,tmp2X);
						}

						if(tmp1Y*tmp2Y>0){
							if(tmp2Y>0)touchInfo.speed.y = Math.max(tmp1Y,tmp2Y);
							else if(tmp2Y<0)touchInfo.speed.y = Math.min(tmp1Y,tmp2Y);
						}

						break;
					}
				}

				if(touchInfo.speed.x == null) touchInfo.speed.x = (lastValueX-tInfo.x) / (dt/1000);
				if(touchInfo.speed.y == null) touchInfo.speed.y = (lastValueY-tInfo.y) / (dt/1000);
			}
			else touchInfo.speed = {x:0,y:0};

			var speed = Math.sqrt(touchInfo.speed.x*touchInfo.speed.x+touchInfo.speed.y*touchInfo.speed.y);
			touchInfo.speed.total = speed;
		}

		private function mouseOver(e:MouseEvent){
			if(_preventDefaultEvent) e.stopPropagation();
			touchInfo.latestMouseEvent = e;

			//暴露onMouseMove
			mouseOverFunction(e,touchInfo);
		}

		private function mouseOut(e:MouseEvent){
			if(_preventDefaultEvent) e.stopPropagation();
			touchInfo.latestMouseEvent = e;

			//暴露onMouseMove
			mouseOutFunction(e,touchInfo);
		}

		private function mouseUp(e:MouseEvent){
			if(_preventDefaultEvent) e.stopPropagation();
			touchInfo.latestMouseEvent = e;

			_doMouseUp(e,true);
		}

		private function mouseUpOutside(e:MouseEvent){
			if(_preventDefaultEvent) e.stopPropagation();
			touchInfo.latestMouseEvent = e;
			
			_doMouseUp(e,false);
		}

		private function waitingForLongClick(e:Event){
			if(_preventDefaultEvent) e.stopPropagation();
			if(getTimer() - _startTime >= _judgeLongClickTime){

				touchInfo.hasLongClick = true;

				//暴露onLongClick
				longClickFunction(touchInfo.latestMouseEvent,touchInfo);

				_stage.removeEventListener(Event.ENTER_FRAME,waitingForLongClick);
			}
		}

		private function _doMouseUp(e:MouseEvent,isInside){
			if(_preventDefaultEvent) e.stopPropagation();

			touchInfo.hasDown = false;
			touchInfo.hasUp = true;

			touchInfo.mouseUpX = getMouseX();
			touchInfo.mouseUpY = getMouseY();
			touchInfo.offsetX = touchInfo.mouseUpX - touchInfo.mouseDownX;
			touchInfo.offsetY = touchInfo.mouseUpY - touchInfo.mouseDownY;

			touchInfo.isClick = isInside && !touchInfo.hasMove && getTimer()-_startTime<_judgeClickTime

			// var dir = 0;
			// if(touchInfo.speed.y <= 0 && touchInfo.speed.x <= 0) dir = Math.abs(touchInfo.speed.x)<Math.abs(touchInfo.speed.y) ? 3:0;
			// else if(touchInfo.speed.y <= 0 && touchInfo.speed.x > 0) dir = Math.abs(touchInfo.speed.x)>Math.abs(touchInfo.speed.y) ? 1:0;
			// else if(touchInfo.speed.y > 0 && touchInfo.speed.x > 0) dir = Math.abs(touchInfo.speed.x)>Math.abs(touchInfo.speed.y) ? 1:2;
			// else if(touchInfo.speed.y > 0 && touchInfo.speed.x <= 0) dir = Math.abs(touchInfo.speed.x)>Math.abs(touchInfo.speed.y) ? 3:2;
			// touchInfo.mouseUpDirection = dir;

			touchInfo.directionAngle = Math.atan2(touchInfo.speed.y,touchInfo.speed.x) * 180 / Math.PI;
			touchInfo.directionAngle = touchInfo.directionAngle <= 0? - touchInfo.directionAngle : 360 - touchInfo.directionAngle;

			if(!touchInfo.isClick) mouseEndMoveFunction(e,touchInfo);
			//暴露onMouseUp
			mouseUpFunction(e,touchInfo);

			//暴露onMouseUpInside
			mouseUpInsideFunction(e,touchInfo);
			//暴露onMouseUpOutside
			mouseUpOutsideFunction(e,touchInfo);

			//暴露onClick
			if(touchInfo.isClick)
				clickFunction(e,touchInfo);

			_stage.removeEventListener(MouseEvent.MOUSE_MOVE,mouseStartMove);
			_stage.removeEventListener(MouseEvent.MOUSE_MOVE,mouseMove);
			target.removeEventListener(MouseEvent.MOUSE_UP,mouseUp);
			target.removeEventListener(MouseEvent.RELEASE_OUTSIDE,mouseUpOutside);
			_stage.removeEventListener(Event.ENTER_FRAME,waitingForLongClick);
			_stage.removeEventListener(Event.ENTER_FRAME,mouseDown2Up);
		}

		private function _calDis(x,y){
			return Math.sqrt(x*x+y*y);
		}

		private function _getCurrentTime(){
			return (new Date()).getTime();
		}

	}
}