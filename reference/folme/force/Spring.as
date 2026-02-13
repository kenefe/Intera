/**
* @Force.spring
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

	// 弹簧
	dynamic public class Spring extends IForce{

		public var response = 0.35;
		public var damping = 0.95;
		public var target = 0;
		private var _tension;
		private var _damping;

		private var mass = 1;

		public var resultValue = 0;
		public var resultSpeed = 0;

		public function Spring(__damping,__response, __mass = 1){
			damping = __damping;
			response = __response;
			
			// var tensionDamping = calTensionDamping(damping,response);
			mass = __mass;
			// if(!response){
			// 	dampinig = 1;
			// 	response = 0;
			// }
			_tension = Math.pow(2*Math.PI / response,2)*mass;//.tension;
			_damping = 4*Math.PI * damping * mass / response;//.damping;
			_damping = Math.min(_damping,60);
		}

		// private function calTensionDamping(damping,response){
		// 	var mass = 1;
		// 	return [
		// 		Math.pow(2*Math.PI / response,2)*mass,
		// 		4*Math.PI * damping * mass / response
		// 	]
		// }

		public override function getValueAndSpeed(value,speed,forceInfo,preForceInfo){

			var f = 0;
			f -= speed * _damping;
			f += _tension * (target-value);
			// f += _tension * (target-value) / Timeline.deltaTime * 1000;

			// var a = _tension * (target-value) - speed * _damping;
			// a = Math.max(a,-Math.abs(target-value) / (Timeline.deltaTime / 1000 / 2) );
			// a = Math.min(a,Math.abs(target-value) / (Timeline.deltaTime / 1000 / 2) );

			// f += a;
			f *= Timeline.deltaTime / 1000;

			speed += f / mass;
			value += speed * Timeline.deltaTime / 1000;
			
			resultValue = value;
			resultSpeed = speed;
		}

		public override function clone(){
			return new Spring(damping,response, mass);
		}

	}
}