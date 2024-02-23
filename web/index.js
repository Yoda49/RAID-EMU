var old_current_speed_mbs = 0;
var old_average_speed_mbs = 0;
var id;

console.log ("Language selected: " + (lang == 0 ? "ENG" : "RUS"));

var language = 
{
	OFFLINE:  ["OFFLINE",  "ВЫКЛЮЧЕН" ],
	ONLINE:   ["ONLINE",   "ВКЛЮЧЕН"  ],
	YES:      ["YES",      "ДА"       ],
	NO:       ["NO",       "НЕТ"      ],
	MB:       ["MB",       "МБ"       ],
	MBS:      ["MB/s",     "МБ/с"     ],
	COMPLETE: ["COMPLETE", "ВЫПОЛНЕНО"] 
}

function time (t)
{
	let h = Math.floor( t / 3600);
	let m = Math.floor((t % 3600) / 60);
	let s = Math.floor( t % 60);
	return (h < 10 ? "0" : "") + h + (m < 10 ? ":0" : ":") + m + (s < 10 ? ":0" : ":") + s;
}





function get_request ()
{
	var xhr = new XMLHttpRequest();
	var query = "/get_request?";
	
	console.log ("Sending request...");
	
	query += "stop=1";
	query += "&options=1";

		
	xhr.open('GET', query, true);
	xhr.setRequestHeader('Content-Type', 'application/json');

	xhr.responseType = 'json';
	
	xhr.timeout = 5000;
	xhr.send();
		
	xhr.onload = function ()
	{
		if (xhr.readyState === xhr.DONE)
		{
			if (xhr.status === 200)
			{
				console.log(xhr.response);
				
				document.getElementById("server_online").innerHTML = language.ONLINE[lang];
				document.getElementById("server_online").style.color = "#00FF00";
				
				// ****************************************
				// SOURCE
				// ****************************************
				if (xhr.response.src_online == 0)
				{
					document.getElementById("src_online").innerHTML = language.OFFLINE[lang];
					document.getElementById("src_online").style.color = "#FF0000";
				}
				else
				{
					document.getElementById("src_online").innerHTML = language.ONLINE[lang];
					document.getElementById("src_online").style.color = "#00FF00";
				}
				
				document.getElementById("src_address"          ).innerHTML = xhr.response.src_address;
				document.getElementById("src_files_count"      ).innerHTML = xhr.response.src_files_count;
				document.getElementById("src_folders_count"    ).innerHTML = xhr.response.src_folders_count;
				document.getElementById("src_tree_updated_flag").innerHTML = language[xhr.response.src_tree_updated_flag][lang];


				// ****************************************
				// DESTINATION
				// ****************************************
				if (xhr.response.dst_online == 0)
				{
					document.getElementById("dst_online").innerHTML = language.OFFLINE[lang];
					document.getElementById("dst_online").style.color = "#FF0000";
				}
				else
				{
					document.getElementById("dst_online").innerHTML = language.ONLINE[lang];
					document.getElementById("dst_online").style.color = "#00FF00";
				}
				
				document.getElementById("dst_address"               ).innerHTML = xhr.response.dst_address;
				document.getElementById("dst_files_count"           ).innerHTML = xhr.response.dst_files_count;
				document.getElementById("dst_folders_count"         ).innerHTML = xhr.response.dst_folders_count;
				document.getElementById("dst_tree_updated_flag"     ).innerHTML = language[xhr.response.dst_tree_updated_flag][lang];
				

				// ****************************************
				// SYNC SERVER
				// ****************************************
				
				if (xhr.response.sync.status == "COMPLETE")
				{
					document.getElementById("sync_current_speed_mbs"    ).innerHTML = "---";
					document.getElementById("sync_current_file_name"    ).innerHTML = language.COMPLETE[lang];
					document.getElementById("sync_current_file_name"    ).style.color = "#00FF00";
					document.getElementById("sync_current_file_status"  ).innerHTML = "NEXT SYNC IN " + time(xhr.response.sync.next_sync_in);
					document.getElementById("sync_current_speed_mbs"    ).innerHTML = "0 " + language.MBS[lang];
					document.getElementById("sync_total_progress"       ).innerHTML = "0 %";
					document.getElementById("sync_files_copied"         ).innerHTML = Math.floor((xhr.response.sync.files_size_total_new - xhr.response.sync.files_size_left) / 1024 / 1024) + " " + language.MB[lang];
				}
				else if (xhr.response.sync.status == "RUNNING")
				{
					document.getElementById("sync_current_speed_mbs"    ).innerHTML = xhr.response.sync.current_speed_mbs + " " + language.MBS[lang];
					document.getElementById("sync_average_speed_mbs"    ).innerHTML = xhr.response.sync.average_speed_mbs + " " + language.MBS[lang];
					document.getElementById("sync_total_progress"       ).innerHTML = xhr.response.sync.total_progress + " %";		
					document.getElementById("sync_deleted_files"        ).innerHTML = xhr.response.sync.deleted_files;
					document.getElementById("sync_deleted_folders"      ).innerHTML = xhr.response.sync.deleted_folders;	
					document.getElementById("sync_new_files"            ).innerHTML = xhr.response.sync.new_files + " [" + Math.floor(xhr.response.sync.files_size_total_new / 1024 / 1024) + " " + language.MB[lang] + "]";
					document.getElementById("sync_new_folders"          ).innerHTML = xhr.response.sync.new_folders;
					document.getElementById("sync_files_copied"         ).innerHTML = Math.floor((xhr.response.sync.files_size_total_new - xhr.response.sync.files_size_left) / 1024 / 1024) + " " + language.MB[lang];
					document.getElementById("sync_time_passed"          ).innerHTML = time(xhr.response.sync.time_passed);
					document.getElementById("sync_time_left"            ).innerHTML = time(xhr.response.sync.time_left);
					document.getElementById("sync_current_file_name"    ).innerHTML = xhr.response.sync.current_file_name;
					document.getElementById("sync_current_file_status"  ).innerHTML = xhr.response.sync.current_file_size + " " + language.MB[lang] + " [" + xhr.response.sync.current_file_progress + "%]";
				
					// ****************************************
					// SPEED DOWN OR UP
					// ****************************************
					if      (xhr.response.sync.current_speed_mbs < old_current_speed_mbs) document.getElementById("sync_current_speed_mbs").innerHTML += "<FONT COLOR ='red'> &#9660;</FONT>";
					else if (xhr.response.sync.current_speed_mbs > old_current_speed_mbs) document.getElementById("sync_current_speed_mbs").innerHTML += "<FONT COLOR ='green'> &#9650;</FONT>";
					old_current_speed_mbs = xhr.response.sync.current_speed_mbs;

					// ****************************************
					// AVERAGE SPEED DOWN OR UP
					// ****************************************
					if      (xhr.response.sync.average_speed_mbs < old_average_speed_mbs) document.getElementById("sync_average_speed_mbs").innerHTML += "<FONT COLOR ='red'> &#9660;</FONT>";
					else if (xhr.response.sync.average_speed_mbs > old_average_speed_mbs) document.getElementById("sync_average_speed_mbs").innerHTML += "<FONT COLOR ='green'> &#9650;</FONT>";
					old_average_speed_mbs = xhr.response.sync.average_speed_mbs;
				}
			}
		}
	};
	
	xhr.onerror = function ()
	{
		document.getElementById("server_online"             ).innerHTML   = language.OFFLINE[lang];
		document.getElementById("server_online"             ).style.color = "#FF0000";
				
		document.getElementById("src_online"                ).innerHTML   = "";
		document.getElementById("dst_online"                ).innerHTML   = "";
		
		document.getElementById("src_address"               ).innerHTML   = "---";
		document.getElementById("src_files_count"           ).innerHTML   = "---";
		document.getElementById("src_folders_count"         ).innerHTML   = "---";
		document.getElementById("src_tree_updated_flag"     ).innerHTML   = "---";
		
		document.getElementById("dst_address"               ).innerHTML   = "---";
		document.getElementById("dst_files_count"           ).innerHTML   = "---";
		document.getElementById("dst_folders_count"         ).innerHTML   = "---";
		document.getElementById("dst_tree_updated_flag"     ).innerHTML   = "---";
		
		document.getElementById("sync_current_file_name"    ).innerHTML   = "";
		document.getElementById("sync_current_file_name"    ).style.color = "";
		document.getElementById("sync_current_file_status"  ).innerHTML   = "";
	};
}


get_request ();

id = setInterval (get_request, 500);