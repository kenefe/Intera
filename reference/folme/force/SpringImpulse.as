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
	dynamic public class SpringImpulse extends IForce{

		public var response = 0.35;
		public var damping = 0.95;
		public var target = 0;
		public var previousTarget = 0;
		private var _tension;
		private var _damping;

		private var mass = 1;
		private var impulse = 0;

		public var resultValue = 0;
		public var resultSpeed = 0;

		public function SpringImpulse(__damping,__response, __impulse = 0, __mass = 1){
			damping = __damping;
			response = __response;
			
			// var tensionDamping = calTensionDamping(damping,response);
			mass = __mass;
			impulse = __impulse;
			// if(!response){
			// 	dampinig = 1;
			// 	response = 0;
			// }
			_tension = calTensionDamping(damping, response, mass)[0];
			_damping = calTensionDamping(damping, response, mass)[1];
			// _damping = Math.min(_damping,60);

			previousTarget = 0;
		}

		private function calTensionDamping(damping, response, mass){
			return [
				Math.pow(2*Math.PI / response,2)*mass,
				4*Math.PI * damping * mass / response
			]
		}

		public override function getValueAndSpeed(value,speed,forceInfo,preForceInfo){

			var f = 0;
			f -= speed * _damping;
			f += _tension * (target-value);

			var displacement = preForceInfo && preForceInfo.forceTarget ? forceInfo.forceTarget - preForceInfo.forceTarget : 0;
			f += _tension * displacement * impulse;

			f *= Timeline.deltaTime / 1000;

			speed += f / mass;

			value += speed * Timeline.deltaTime / 1000;
			
			resultValue = value;
			resultSpeed = speed;
		}

		public override function clone(){
			return new SpringImpulse(damping,response, impulse, mass);
		}

	}
}