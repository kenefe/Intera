/**
* @Force
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

	// 力的抽象类
	dynamic public class IForce extends MovieClip{

		public function getValueAndSpeed(value,speed,forceInfo,preForceInfo){
		}

		public function clone(){
			return new IForce();
		}

	}
}