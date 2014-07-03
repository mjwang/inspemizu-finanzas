
$(document).ready(function(){

  $('.clickable-row').click(function(){
    window.document.location = $(this).attr("href");
  });

  $('.datepicker').datepicker({
    format: "mm/yyyy",
    startView: 1,
    viewMode: 1,
    minViewMode: 1,
  });

  $('button.delete-ps').click(function(){
    var pid = $(this).attr('id');
    var url = $(this).attr('href');
    bootbox.confirm("Usted está seguro que quiere borrar este pago para este estudiante?", function(result){
      $.post(url, function(data){
        location.reload();  
      }); 
    });
  });

  $('button.delete-s').click(function(){
    var sid = $(this).attr('id');
    bootbox.confirm("Usted está seguro que quiere borrar este estudiante?", function(result){
      if(result){
        var url="/delete_student";
        var req = {sid: sid};
	
	$.post(url, req, function(data){
		location.reload();
	});

      } else {
        console.log("Cancelled Deletion");
      } 
    });
  });

  $('button.delete-p').click(function(){
    var pid = $(this).attr('id');
    bootbox.confirm("Usted está seguro que quiere borrar este pago?", function(result) {
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
    bootbox.confirm("Usted está seguro que quiere borrar este gasto?", function(result){
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
    bootbox.confirm("Usted está seguro que quiere borrar este curso?", function(result){
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
