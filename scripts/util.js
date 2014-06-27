
$(document).ready(function(){

  $('.clickable-row').click(function(){
    window.document.location = $(this).attr("href");
  });


  $('button.delete-p').click(function(){
    var pid = $(this).attr('id');
    bootbox.confirm("Are you sure you want to delete this payment?", function(result) {
      if (result){
        var url = "/delete_payment";
        var req = {pid: pid}; 

	$.post(url, req, function(data){
		location.reload();
	});

      } else {
        console.log("Cancelled Deletion");
      }
    });
  });

  $('button.delete-e').click(function(e){
    var eid = $(this).attr('id');
    bootbox.confirm("Are you sure you want to delete this gasto?", function(result){
      if (result){
        var url = "/delete_expense";
        var req = {eid: eid};
        $.post(url, req, function(data){
		location.reload();
	});
      } else {
        console.log("Cancelled");
      }
    });
  });  

  $('.delete-c').click(function(){
    var cid = $(this).attr('id');
    bootbox.confirm("Are you sure you want to delete this curso?", function(result){
      if (result){
        var url="/delete_class";
        var req = {cid: cid}; 
	
	$.post(url, req);

      } else {
        console.log("Cancelled");
      }
    });
  });

});
