//globals
var fields = [ 'ENC_CUST_ID', 'FIRST_NAME', 'LAST_NAME', 'EMAIL', 'ORGANIZATION', 'TITLE', 'CITY', 'STATE', 'COUNTRY', 'NOTE' ];
var NA = 'N/A';
var active_item = '';
var db = openDatabase( 'INFORMS contact', '', 'INFORMS Contact Database', 2 * 1024 * 1024 );
var popupTimer = null;
var ding = null;

// create the database tables if they do not already exist
db.transaction(function ( tx ) {
  //tx.executeSql('DROP TABLE CONTACT');
  tx.executeSql('CREATE TABLE IF NOT EXISTS CONTACT ( ENC_CUST_ID PRIMARY KEY, FIRST_NAME, LAST_NAME, EMAIL, ORGANIZATION, TITLE, CITY, STATE, COUNTRY, NOTE )');
  //tx.executeSql('DELETE FROM CONTACT'); // for testing purposes, clearing the table each page load   
  //alert( 'database initialization complete' );  
});

function getCardHTML(arr, showActionButtons, showNote)
{
    var display = '<table style="border:1px solid black; background:white; margin:auto; width:100%">'+
                  '<tr>'+
                      '<td style="background-color:#e27d1f; color:white; border:1px dotted #e27d1f; vertical-align:bottom; padding:3px;">'+arr.FIRST_NAME+' '+arr.LAST_NAME;

    if( showActionButtons == true )
    {
       display += getDeleteButton(arr.ENC_CUST_ID);
       display += getEditButton(arr.ENC_CUST_ID);
    }

       display += '</td>'+
                  '</tr>';

       if( arr.EMAIL != NA )
       display += '<tr>'+
                      '<td class="details">'+arr.EMAIL+'</td>'+
                  '</tr>';

       if( arr.ORGANIZATION != NA )
       display += '<tr>'+
                      '<td class="details">'+arr.ORGANIZATION+'</td>'+
                  '</tr>';

       if( arr.TITLE != NA )
       display += '<tr>'+
                      '<td class="details">'+arr.TITLE+'</td>'+
                  '</tr>';

       var loc = NA;
       if( arr.CITY != NA ) loc = arr.CITY;
       if( loc != NA && arr.STATE != NA ) loc += ' '+arr.STATE;
       else if( arr.STATE != NA ) loc = arr.STATE;

       if( loc != NA )
       display += '<tr>'+
                      '<td class="details">'+loc+'</td>'+
                  '</tr>';

       if( arr.COUNTRY != NA )
       display += '<tr>'+
                      '<td class="details">'+arr.COUNTRY+'</td>'+
                  '</tr>';

    if( showNote == true )
    {
       if( arr.NOTE != '' )
       display += '<tr>'+
                      '<td class="details">NOTES: '+arr.NOTE+'</td>'+
                  '</tr>';
    }

       display += '</table>';

    return display;
}
function csv_prep(str)
{
  return str.toString().replace(/"/g, '""');
}

function getCardCSV(arr)
{
    var display = '"'+csv_prep(arr.FIRST_NAME)+' '+csv_prep(arr.LAST_NAME)+
                '","'+csv_prep(arr.EMAIL)+
                '","'+csv_prep(arr.ORGANIZATION)+
                '","'+csv_prep(arr.TITLE)+
                '","'+csv_prep(arr.CITY)+
                '","'+csv_prep(arr.STATE)+
                '","'+csv_prep(arr.COUNTRY)+
                '","'+csv_prep(arr.NOTE)+
                "\"\n";

    return display;
}

function getCardVCF(arr)
{
  var display = "BEGIN:VCARD\n"+
                "VERSION:3.0\n"+
                "N:\n"+arr.LAST_NAME+";"+arr.FIRST_NAME+";;;\n"+
                "FN:"+arr.FIRST_NAME+" "+arr.LAST_NAME+"\n";

  if( arr.TITLE != NA )
     display += "TITLE:"+arr.TITLE+"\n";

     display += "NOTE:"+arr.NOTE+"\n"+
                "ADR;TYPE=WORK:;;;"+arr.CITY+';'+arr.STATE+';;'+arr.COUNTRY+"\n"+
                "ORG:"+arr.ORGANIZATION+"\n";
                if( arr.EMAIL != NA ) display += "EMAIL:"+arr.EMAIL+"\n";

     display += "END:VCARD\n";
  return display;
}

function data_success(json) {
  if ( typeof json === 'object' ) {
    display = getCardHTML(json.attendee[0], true, false);
    $('#p').html(display);

    db.transaction( function(tx) {
        var sql = "INSERT INTO CONTACT ("+fields.toString()+") VALUES ( "+
                  "'" + json.attendee[0].ENC_CUST_ID + "'," +
                  "'" + json.attendee[0].FIRST_NAME + "'," +
                  "'" + json.attendee[0].LAST_NAME + "'," +
                  "'" + json.attendee[0].EMAIL + "'," +
                  "'" + json.attendee[0].ORGANIZATION + "'," +
                  "'" + json.attendee[0].TITLE + "'," +
                  "'" + json.attendee[0].CITY + "'," +
                  "'" + json.attendee[0].STATE + "'," +
                  "'" + json.attendee[0].COUNTRY + "'," +
                  "''" +
                  " );";
        tx.executeSql( sql, [], function(tx, result) {
          //alert( 'Scan successful (id = ' + json.attendee[0].ENC_CUST_ID + ')' );
          ding.play();
        }, function(){alert('Already scanned!');});
    });
    displayContactActionButtons();
  }
  else {
     $('#p').html('other data type');
  }
}

function ajax_error(data) {
  alert('error in ajax call');
}

function errorHandler(err) { alert(err); }

function getContact(url) {
  var arr = /q=(.*)$/.exec(url);
  var q = arr[1];
  db.transaction( function(tx) {
    var sql = "SELECT * FROM CONTACT WHERE ENC_CUST_ID = '"+q+"'";
    tx.executeSql( sql, [], function(tx, result) {
      var therows = result.rows;
      if( therows.length == 0 )
      {
        $('#p').html('Please wait ...');
        $.ajax({
          dataType: "json",
          url: url+'&ibr=1',
          success: data_success,
          error: ajax_error
        });
      }
      else
      {
        alert('Badge already scanned!');
        $.mobile.pageContainer.pagecontainer("change", "");
      }
    });
  });
}

function scan() {
  var scanner = cordova.require("cordova/plugin/BarcodeScanner");
  scanner.scan(
    function (result) {
      var url = result.text;
      getContact(url);
    },
    function (error) {
      alert("Scanning failed: " + error);
    }
  );
}

function deleteCollectedCards()
{
  db.transaction( function(tx) {
       var sql = "DELETE FROM CONTACT";
       tx.executeSql( sql, [], function(tx, result) {
       });
   });
   resetPage();
}

function resetPage() {
  $('#collected_card_list').html('');
  $('#p').html('');
  displayContactActionButtons();
  //location.reload();
}

function getDeleteButton(id)
{
   return '<img src="images/icons-png/delete-white.png" style="float:right;margin-left:30px" width="8%" onClick="if( confirm(\'Delete this card?\') ) { deleteCard(\''+id+'\'); }">';
}

function getEditButton(id)
{
   return '<img src="images/icons-png/edit-white.png" style="float:right" width="8%" id="EDIT'+id+'" onClick="getEditCardScreen(\''+id+'\')">';
}

function deleteCard(id)
{
  db.transaction( function(tx) {
       var sql = "DELETE FROM CONTACT WHERE ENC_CUST_ID = '"+id+"'";
       tx.executeSql( sql, [], function(tx, result) {
       });
  });
  resetPage();
  showCollectedCards();
}

function editField(id, field, value)
{
  db.transaction( function(tx) {
       var sql = "UPDATE CONTACT SET "+field+" = '"+value+"' WHERE ENC_CUST_ID = '"+id+"'";
       tx.executeSql( sql, [], function(tx, result) {
          $('#editmsg').html('Change saved');
       });
  });
}

function getEditCardScreen(id)
{
  $('#collected_card_list').html('');
  active_item = $(this).attr( 'id' );
  $.mobile.pageContainer.pagecontainer("change", "#editcontact_page");
  db.transaction( function(tx) {
    var sql = "SELECT * FROM CONTACT WHERE ENC_CUST_ID = '"+id+"'";
    tx.executeSql( sql, [], function(tx, result) {
      var display = '';
      if( result.rows.length == 1 )
      {
        row = result.rows.item(0);
        display += "<div data-role='fieldcontain'>";
        display += "<h2>"+row.FIRST_NAME+' '+row.LAST_NAME+"</h2>";
        display += "<div>EMAIL:</div><div><input type='text' data-theme='a' onBlur='editField(\""+id+"\", \"EMAIL\", this.value)' value='"+row.EMAIL+"'></div>";
        display += "<div>ORGANIZATION:</div><div><input type='text' data-theme='a' onBlur='editField(\""+id+"\", \"ORGANIZATION\", this.value)' value='"+row.ORGANIZATION+"'></div>";
        display += "<div>TITLE:</div><div><input type='text' data-theme='a' onBlur='editField(\""+id+"\", \"TITLE\", this.value)' value='"+row.TITLE+"'></div>";
        display += "<div>CITY:</div><div><input type='text' data-theme='a' onBlur='editField(\""+id+"\", \"CITY\", this.value)' value='"+row.CITY+"'></div>";
        display += "<div>STATE:</div><div><input type='text' data-theme='a' onBlur='editField(\""+id+"\", \"STATE\", this.value)' value='"+row.STATE+"'></div>";
        display += "<div>COUNTRY:</div><div><input type='text' data-theme='a' onBlur='editField(\""+id+"\", \"COUNTRY\", this.value)' value='"+row.COUNTRY+"'></div>";
        display += "<div>NOTE:</div><div><textarea cols='30' rows='4' data-theme='a' onBlur='editField(\""+id+"\", \"NOTE\", this.value)'>"+row.NOTE+"</textarea></div>";
        display += "</div>";
      }
      $('#editform').html(display);
    });
  });
}

function showCollectedCards()
{
  db.transaction( function(tx) {
       var sql = "SELECT * FROM CONTACT ORDER BY FIRST_NAME";
       tx.executeSql( sql, [], function(tx, result) {
         var therows = result.rows;
         var count = therows.length;
         var display = '';
         for( var i = 0; i < count; i++) {
            var therow = result.rows.item(i);
            display += getCardHTML(therow, true, true);
         }
         $('#collected_card_list').html(display);
       });
   });
}

function emailCollectedCards(email, format)
{
  db.transaction( function(tx) {
       var sql = "SELECT * FROM CONTACT";
       tx.executeSql( sql, [], function(tx, result) {
         var therows = result.rows;
         var count = therows.length;
         var content = '';
         if( format == 'csv' ) content = '"NAME","EMAIL","ORGANIZATION","TITLE","CITY","STATE","COUNTRY","NOTES"'+"\n";
         for( var i = 0; i < count; i++) {
            var therow = result.rows.item(i);
                 if( format == 'html' ) content += getCardHTML(therow, false, true);
            else if( format == 'csv' ) content += getCardCSV(therow);
            else {
               format = 'vcf';
               content += getCardVCF(therow);
            }
         }
         $('#collected_card_list').html('Please wait ...');
         $.ajax({
           dataType: 'html',
           url: 'https://services.informs.org/email_contacts.php',
           type: 'POST',
           data: { content: content, email: email, format: format, token: 'vBm7zPnRseKKf2La' },
           success: function(msg) {
                      if( msg != '' ) alert('NOTE: '+msg);
                      $('#EMAIL_FORM').hide();
                      $('#SHOW_EMAIL_FORM').show();
                      showCollectedCards();
                    }
           ,error: ajax_error
         });
       });
   });
}

function loadAudio(src) {
  if (device.platform == 'Android') {
    src = '/android_asset/www/' + src;
  }
  var media = new Media(src, mediaSuccess, mediaError);
  return media;
}

function mediaError( e ) { alert(e.message); }

function mediaSuccess() {}

function onLoad() {
  document.addEventListener("deviceready", onDeviceReady, false);
  displayContactActionButtons();
/*
  window.addEventListener('load', function() {
    FastClick.attach(document.body);
  }, false);
*/
}

function displayContactActionButtons()
{
  $('#EMAIL_FORM').hide();
  db.transaction( function(tx) {
    var sql = "SELECT * FROM CONTACT";
    tx.executeSql( sql, [], function(tx, result) {
      if( result.rows.length == 0 ) {
        $('#LIST').hide();
        $('#EMPTY').hide();
        $('#SHOW_EMAIL_FORM').hide();
      }
      else {
        $('#LIST').show();
        $('#EMPTY').show();
        $('#SHOW_EMAIL_FORM').show();
      }
    });
  });
}

function onDeviceReady() {
  ding = loadAudio( 'audio/ding.mp3' );
}

// bind touch events
$(document).on( "pagecreate", "#scanner_page", function(){
  //$('#scan_button').on("tap",function(){ scan(); });
  //$('#scan_button').on("taphold",function(){ scan(); });
});

$(document).ready( function() {
  onLoad();
  $('#SHOW_EMAIL_FORM').click( function() {
     db.transaction( function(tx) {
       var sql = "SELECT * FROM CONTACT";
       tx.executeSql( sql, [], function(tx, result) {
         var therows = result.rows;
         var count = therows.length;
         if( count > 0 ) {
           $('#EMAIL_FORM').show();
           $('#SHOW_EMAIL_FORM').hide();
         }
         else
         {
           alert('Nothing to send!');
         }
       });
     });
  });
  $('#SEND').click( function() {
    emailCollectedCards($('#EMAIL_ADDRESS').val(), $('#FORMAT_CHOICES').val());
    //emailCollectedCards($('#EMAIL_ADDRESS').val(), $('input[name=email_format]:checked').val());
  });
  $('#LIST').click( function() {
    showCollectedCards();
  });
  $('#SCAN').click( function() {
    $.mobile.pageContainer.pagecontainer("change", "#scanner_page");
    scan();
    //for testing: getContact('https://q.informs.org/?q=vBm7zPnRseKKf2La');
    $('#p').html('');
  });
  $('#reinitdb_button').click( function() {
    ret = confirm('Are you sure?');
    if( ret == true )
    {
      deleteCollectedCards();
      $.mobile.pageContainer.pagecontainer("change", "");
      showCollectedCards();
    }
  });
  $('.go_home').click( function() {
    $.mobile.pageContainer.pagecontainer("change", "");
  });
  $('.back_button').click( function() {
    parent.history.back();
  });
});
