/**
* @Force.acceleration
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

	// 重力/加速度
	dynamic public class Acceleration extends IForce{

		public var acc = 9.8;

		public var resultValue = 0;
		public var resultSpeed = 0;

		public function Acceleration(_acc){
			acc = _acc;
		}
		
		public override function getValueAndSpeed(value,speed,forceInfo,preForceInfo){
			var f = acc;// * Timeline.deltaTime / 1000;
			// return speed + f * Timeline.deltaTime / 1000;;

			speed += f * Timeline.deltaTime / 1000;
			value += speed * Timeline.deltaTime / 1000;
			// return [value,speed]
			resultValue = value;
			resultSpeed = speed;
		}

		public override function clone(){
			return new Acceleration(acc);
		}

	}
}