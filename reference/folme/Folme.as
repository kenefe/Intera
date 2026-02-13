/**
* @Folme
* @author kenefe kenefe.li@gmail.com
* @version 3.0
*/
package com.kenefe.folme {
	import flash.display.*;
	import flash.events.*;
	import flash.text.*;
	import flash.utils.*;
	import flash.system.System;

	import com.kenefe.*;

	public class Folme extends MovieClip{

		public static var tl = new Timeline();

		// 绑定stage，用作获取frameRate
		// public static var setStage = Timeline.setStage;
		public static var setFrameRate = Timeline.setFrameRate;
		public static var setTimeScale = Timeline.setTimeScale;


		

		public static var VIEW_TYPE_INSERT = Sugar.VIEW_TYPE.INSERT;
		public static var VIEW_TYPE_BLOCK = Sugar.VIEW_TYPE.BLOCK;

		public static var SUGAR_EVENT_MOUSE_DOWN = Sugar.SUGAR_EVENT.MOUSE_DOWN;
		public static var SUGAR_EVENT_MOUSE_UP = Sugar.SUGAR_EVENT.MOUSE_UP;
		public static var SUGAR_EVENT_LONG_CLICK = Sugar.SUGAR_EVENT.LONG_CLICK;
		public static var SUGAR_EVENT_SHOW = Sugar.SUGAR_EVENT.SHOW;
		public static var SUGAR_EVENT_HIDE = Sugar.SUGAR_EVENT.HIDE;

		public static var STATUS_PLAYING = Ani.STATUS.PLAYING;
		public static var STATUS_STOPPED = Ani.STATUS.STOPPED;

		public static var RANGE_TYPE_STOP = AniRequest.RANGE_TYPE.STOP;
		public static var RANGE_TYPE_OVERSHOOT = AniRequest.RANGE_TYPE.OVERSHOOT;
		public static var RANGE_TYPE_REBOUND = AniRequest.RANGE_TYPE.REBOUND;
		public static var RANGE_TYPE_CUSTOM = AniRequest.RANGE_TYPE.CUSTOM;


		// 为了FolmeDrag和MouseAction不用设置stage和mouseXY
		private static var _root;
		private static var _stage;
		public static function setRoot(root){ 
			_root = root; 
			_stage = _root.stage; 
			// LocalDevice.updateFrameRate(_stage);
			return Folme;
		}
		public static function setStage(stage){ _stage = stage; return Folme;}
		public static function getStage(){ return _stage; }

		public static function getMouseX(){ return _root? _root.mouseX : 0 ; }
		public static function getMouseY(){ return _root? _root.mouseY : 0 ; }		




		public static function useAt(view,viewType = undefined){
			var viewList = [];
			if(view is Array) viewList = view;
			else viewList = [view];
			viewList.forEach(function(view){
				if(!view || view.folme) return;
				view.folme = new FolmeManager(view,viewType);
			})
			return view is Array ? viewList.map(function(v){ return v.folme}) : view.folme;
		}

		public static function getAni(view,id){
			if(!view.folme) throw Error('You need to "Folme.useAt(view)" first.');
			return view.folme.getAni(id);
		}




		public static function perFromVal(now,from,to){
			return (now-from)/(to-from);
		}

		public static function valFromPer(per,from,to){
			return from + (to-from)*per;
		}

		public static function tint(tint,tintAmount = 1){
			return new Tint(tint,tintAmount);
		}

		public static function perlin(t,seed = 0){
			x += seed;
			var amplitude = 1.;
			var frequency = 1.;
			var x = 0;
			var y = Math.sin(x * frequency);
			y += Math.sin(x*frequency*2.1 + t)*4.5;
			y += Math.sin(x*frequency*1.72 + t*1.121)*4.0;
			y += Math.sin(x*frequency*2.221 + t*0.437)*5.0;
			y += Math.sin(x*frequency*3.1122+ t*4.269)*2.5;
			y *= amplitude*0.06;
			return y;
		}

		public static function afterFrictionValue(val,range = 1){
			if(!range) return 0;

			var t = val>=0?1:-1
			val = Math.abs(val);
			

			var per = Math.min(val/range,1);
			return t * (per*per*per/3 - per*per + per) * range;
		}


		public static function crossPointWithX(fromX,fromY,speedX,speedY,x){
			return speedX ? fromY + (x - fromX) * speedY / speedX : fromY;
		}

		public static function crossPointWithY(fromX,fromY,speedX,speedY,y){
			return speedY ? fromX + (y - fromY) / ( speedY / speedX ) : fromX;
		}






		public static function calPredict(val,speed,friction = 1/2.1){
			var _dragLog = friction * -4.2;
			return val + (- speed / _dragLog);
		}


		public static function allTo(arr,a,b = undefined,c = undefined){
			arr.forEach(function(item){
				item.folme.to(a,b,c);
			})
		}

		public static function allSetTo(arr,a,b = undefined,c = undefined){
			arr.forEach(function(item){
				item.folme.setTo(a,b,c);
			})
		}

		public static function allNearlySetTo(arr,a,b = undefined,c = undefined){
			arr.forEach(function(item){
				item.folme.nearlySetTo(a,b,c);
			})
		}










		private static var specialId = {
			autoAlpha:'alpha'
			// rotation:'rotationZ'
		}

		public static function getSaveId(id){
			id = specialId[id] || id;
			return id;
		}

	}
}