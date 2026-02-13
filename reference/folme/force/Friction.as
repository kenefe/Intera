/**
* @Force.friction
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

	// 摩擦力
	dynamic public class Friction extends IForce{

		public var resultValue = 0;
		public var resultSpeed = 0;

		public var friction;
		public var sourceFriction = 1/2.1;

		public function Friction(_friction){
			sourceFriction = _friction;
			var _dragLog = _friction * -4.2;
			var _drag = Math.pow(Math.E,_dragLog);
			friction = _drag;
		}
		
		public override function getValueAndSpeed(value,speed,forceInfo,preForceInfo){

			var preSpeed = speed;
			speed = speed * Math.pow(friction,Timeline.deltaTime/1000);
			value += (preSpeed+speed)/2 * Timeline.deltaTime / 1000;

			resultValue = value;
			resultSpeed = speed;			
		}

		public override function clone(){
			return new Friction(sourceFriction);
		}

	}
}