/**
* @Force.perlin
* @author kenefe kenefe.li@gmail.com
* @version 3.0
*/
package com.kenefe.folme.force {
	import flash.display.*;
	import flash.events.*;
	import flash.text.*;
	import flash.utils.*;
	import flash.system.System;

	import com.kenefe.folme.*;

	dynamic public class Perlin extends IForce{

		public var target = 0;
		public var curTime = 0;
		
		private var _changeSpeed = 1;
		private var _stepDistance = 0;

		public var resultValue = 0;
		public var resultSpeed = 0;

		public function Perlin(changeSpeed,stepDistance){
			_changeSpeed = changeSpeed * 0.1;
			_stepDistance = stepDistance;
			curTime = Math.random() * 100;
		}
		
		public override function getValueAndSpeed(value,speed,forceInfo,preForceInfo){
			curTime += Timeline.deltaTime / 1000;
			value += perlin(curTime) * _stepDistance * Timeline.deltaTime/1000;
			resultValue = value;
			resultSpeed = speed;
		}

		public override function clone(){
			return new Perlin(_changeSpeed,_stepDistance);
		}

		private function perlin(t){
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

	}
}