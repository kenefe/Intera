/**
* @Force.force
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


	dynamic public class Force extends IForce{


		public var resultValue = 0;
		public var resultSpeed = 0;

		
		public function Force(){}

		public override function getValueAndSpeed(value,speed,forceInfo,preForceInfo){
			resultValue = value;
			resultSpeed = speed;
		}

		public override function clone(){
			return new Force();
		}

	}
}