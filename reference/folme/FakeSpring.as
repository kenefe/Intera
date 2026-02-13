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
	dynamic public class FakeSpring extends IEasing{

		// public var fromValue = 0;
		// public var toValue = 1;

		// public var curTime = 0;
		// public var duration = 0.3;
		// public var interpolator = function(x){return x;}

		// public var progress = 0;

		private var mInitial = -1.0;

		private var m = 1.0;
		private var k;
		private var c;

		private var w;
		private var r;
		private var c1 = mInitial;
		private var c2;

		private var _damping;
		private var _response;

		public function FakeSpring(damping,response,_duration){
			super(interpolator,duration);
			_damping = damping;
			_response = response;
			k = (Math.pow(2.0 * Math.PI / response, 2.0) * m);
			c = (4.0 * Math.PI * damping * m / response);
			w = Math.sqrt(4.0 * m * k - c * c) / (2.0 * m);
			r = -(c / 2 * m);
			c2 = (0 - r * mInitial) / w;
			duration = _duration;
		}

		override public function getValue(deltaTime){
			curTime += deltaTime;
			var per = curTime / (1000 * duration);
			per = Math.max(0,per);
			per = Math.min(1,per);
			per = calFakeSpring(per);
			progress = per;
			var value = Folme.valFromPer(per,fromValue,toValue);
			return value;
		}

		private function calFakeSpring(per){
			var res = (Math.pow(Math.E, r * per) * (c1 * Math.cos(w * per) + c2 * Math.sin(w * per)) + 1.0);
			return res;
		}

		override public function clone(){
			return new FakeSpring(_damping,_response,duration);
		}

	}
}