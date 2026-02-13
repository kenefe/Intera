/**
* @Force.gravity
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
	dynamic public class Gravity extends IForce{

		public var target = 0;

		public var g = 1000;

		public var resultValue = 0;
		public var resultSpeed = 0;

		public function Gravity(_g){
			g = _g;
		}
		
		public override function getValueAndSpeed(value,speed,forceInfo,preForceInfo){

			var distance = Math.abs(target - value);

			// TODO: sth wrong with gravity effect
			// distance = Math.min(1000,distance)
			// distance = Math.max(580,distance);
			var strength = g / Math.sqrt(distance*distance);
			var f = (target - value > 0 ? 1:-1) * strength;// * Timeline.deltaTime / 1000;

			f *= Timeline.deltaTime / 1000;

			speed += f;
			value += speed * Timeline.deltaTime / 1000;
			// return [value,speed]
			resultValue = value;
			resultSpeed = speed;
		}

		public override function clone(){
			return new Gravity(g);
		}

	}
}