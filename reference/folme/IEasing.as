/**
* @Easing
* @author kenefe kenefe.li@gmail.com
* @version 3.0
*/
package com.kenefe.folme {
	import flash.display.*;
	import flash.events.*;
	import flash.text.*;
	import flash.utils.*;
	import flash.system.System;

	import com.kenefe.folme.*;

	// 插值器的抽象类
	dynamic public class IEasing extends MovieClip{

		public var fromValue = 0;
		public var toValue = 1;

		public var curTime = 0;
		public var duration = 0.3;
		public var interpolator = function(x){return x;}

		public var progress = 0;

		public function IEasing(_interpolator,_duration){
			interpolator = _interpolator;
			duration = _duration;
		}

		public function getValue(deltaTime){
			curTime += deltaTime;
			var per = curTime / (1000 * duration);
			per = Math.max(0,per);
			per = Math.min(1,per);
			per = interpolator(per);
			progress = per;
			var value = Folme.valFromPer(per,fromValue,toValue);
			return value;
		}

		public function clone(){
			return new IEasing(interpolator,duration);
		}

	}
}