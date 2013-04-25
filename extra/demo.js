/**
 * Demo "Scrollar"
 * Author: Alexander Leutsky
 */


$(function () {
    var s = new Scrollar({
        "element" : "#scrollarea",
        "vscroll" : true,
        "hscroll" : true
    });

    //s.content('<img src="extra/content.jpg" style="padding: 5px;margin: 0;">');
    var t = "";
    for (var i = 0; i < 100; i++) {
        t += "<p style='width:500px;'>hjd fhjsd hfjksd fhksdhkfdks jfhkjsdhf jksdh jfkhsdkjf jksdhf k</p>"
    }
    //s.content(t);
});