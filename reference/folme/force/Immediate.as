/**
* @Force.immediate
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

	// setTo
	dynamic public class Immediate extends IForce{

		public var target = 0;

		public var resultValue = 0;
		public var resultSpeed = 0;

		public function Immediate(){}
		
		public override function getValueAndSpeed(value,speed,forceInfo,preForceInfo){
			// return [value,0]
			resultValue = value;
			resultSpeed = 0;
		}

		public override function clone(){
			return new Immediate();
		}

	}
}