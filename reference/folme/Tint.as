/**
* @FolmeManager
* @author kenefe kenefe.li@gmail.com
* @version 3.0
*/
package com.kenefe.folme {
	import flash.display.*;
	import flash.events.*;
	import flash.text.*;
	import flash.utils.*;
	import flash.system.System;
	import flash.geom.ColorTransform;

	public class Tint extends MovieClip{

		public var tint = 0;
		public var tintAmount = 1;

		public function Tint(_tint,_tintAmount = 1){
			tint = _tint;
			tintAmount = _tintAmount;
		}

		// 根据 tint 和 tintAmount 生成 colorTransform
		public static function tintToColorTransform(tintColor, tintMultiplier){
            var colTransform = new ColorTransform();
            colTransform.redMultiplier = colTransform.greenMultiplier = colTransform.blueMultiplier = 1-tintMultiplier;
            colTransform.redOffset = Math.round(((tintColor & 0xFF0000) >> 16) * tintMultiplier);
            colTransform.greenOffset = Math.round(((tintColor & 0x00FF00) >> 8) * tintMultiplier);
            colTransform.blueOffset = Math.round(((tintColor & 0x0000FF)) * tintMultiplier);
            return colTransform;
        }

		// 根据 colorTransform 还原 tint 和 tintAmount
		public static function colorTransformToTint(colorTransform){
			var tintAmount = 1-colorTransform.redMultiplier;
			var redOffset = colorTransform.redOffset / (1 - colorTransform.redMultiplier);
			var greenOffset = colorTransform.greenOffset / (1 - colorTransform.greenMultiplier);
			var blueOffset = colorTransform.blueOffset / (1 - colorTransform.blueMultiplier);
			var tint = (redOffset << 16) + (greenOffset << 8) + (blueOffset);
			return {
				tint:tint,
				tintAmount:tintAmount
			}
		}

		public function equal(otherTint){
			return tint = otherTint.tint && tintAmount == otherTint.tintAmount;
		}

	}
}