/**
* @LinkArray
* @author kenefe kenefe.li@gmail.com
* @version 3.0
*/
package com.kenefe.folme {
	import flash.display.*;
	import flash.events.*;
	import flash.text.*;
	import flash.utils.*;
	import flash.system.System;

	public class LinkArray{
		private var arr = [];
		private var startPoint = -1;
		private var endPoint = -1;
		public var length = 0;

		public function LinkArray(){

		}
		
		public function add(obj){
			arr.push(obj);
			obj.next = -1;



			var id = arr.length-1;
			if(length == 0){
				startPoint = id;
				endPoint = id;
				obj.pre = -1;
			}
			else {
				arr[endPoint].next = id;
				obj.pre = endPoint;
				endPoint = id;
			}

			length++;
		}

		public function remove(obj){
			if(obj.pre<0) startPoint = obj.next;
			else arr[obj.pre].next = obj.next;
			
			if(obj.next>=0) arr[obj.next].pre = obj.pre;
			else endPoint = obj.pre;

			obj = null;
			length--;

		}

		public function forEach(func){
			if(length == 0) return;
			var p = startPoint;
			func(arr[p]);
			while(arr[p].next>=0){
				p = arr[p].next;
				func(arr[p]);
			}
		}

		public function first(){
			return length? arr[startPoint] : undefined;
		}
	}
}