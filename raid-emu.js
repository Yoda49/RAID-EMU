const http = require('http');
const fsp  = require('fs').promises;
const fs   = require('fs');
const os   = require('os');

process.stdout.write("\033[2J\033[H\033[32m");

console.log(" ====================================================");
console.log("| ####     ###   #  ####       #####  ##   ##  #   # |");
console.log("| #   #   #  #   #  #   #      #      # # # #  #   # |");
console.log("| ####   #####   #  #   #  ##  #####  #  #  #  #   # |");
console.log("| #  #   #   #   #  #   #      #      #     #  #   # |");
console.log("| #   #  #   #   #  ####       #####  #     #   #### |");
console.log("|                                                    |");
console.log("| Version: 1.0                                       |");
console.log("| Author: Yurevich Pavel                             |");
console.log("| https://github.com/Yoda49/RAID-EMU/                |");
console.log(" ====================================================\n\033[37m");

var recycler_folder_list = {};
var temp;
var seconds  = 0;
var seconds_ = 0;

var MARKER_new_folders = 0;
var MARKER_new_files   = 0;
var MARKER_del_folders = 0;
var MARKER_del_files   = 0;

var sync = 
{
	current_speed_mbs:     0,
	average_speed_mbs:     0,
	total_progress:        0,
	new_folders:           0,
	new_files:             0,
	deleted_folders:       0,
	deleted_files:         0,
	files_size_total_new:  0, // size to be copied
	files_size_total_del:  0, // size to be deleted
	files_size_left:       0,
	current_file_name:    "",
	current_file_size:     0,
	current_file_progress: 0,
	time_passed:           0,
	time_left:             0,
	status:                "NOT_STARTED",
	next_sync_in:          0
};

var src = 
{
	address:             "",
	online:               0,
	files_count:          0,
	folders_count:        0,
	tree_updated_flag: "NO",
	tree:                {}
};

var dst = 
{ 
	address:             "",
	online:               0,
	files_count:          0,
	folders_count:        0,
	tree_updated_flag: "NO",
	tree:                 {}
};

var options = 
{
	source_path:          undefined,
	destination_path:     undefined,
	console_stage1_show:  undefined,
	console_stage2_show:  undefined,
	console_stage3_show:  undefined,
	console_stage4_show:  undefined,
	console_stage5_show:  undefined,
	web_interface:        undefined,
	close_after_sync:     undefined,
	trees_update_period:  undefined
}



// **************************************************************************************************************************************************************
// READ OPTIONS 
// **************************************************************************************************************************************************************
try
{
	temp = "" + fs.readFileSync (".\\raid-emu.cfg");
	temp = temp.split('\n');
	
	options.source_path         = (temp[0]).split("=")[1].trim();
	options.destination_path    = (temp[1]).split("=")[1].trim();
	options.console_stage1_show = (temp[2]).split("=")[1].trim();
	options.console_stage2_show = (temp[3]).split("=")[1].trim();
	options.console_stage3_show = (temp[4]).split("=")[1].trim();
	options.console_stage4_show = (temp[5]).split("=")[1].trim();
	options.console_stage5_show = (temp[6]).split("=")[1].trim();
	options.web_interface       = (temp[7]).split("=")[1].trim();
	options.close_after_sync    = (temp[8]).split("=")[1].trim();
	options.sync_update_period  = (temp[9]).split("=")[1].trim();
	
	sync.next_sync_in  = parseInt(options.sync_update_period);
}
catch(e)
{
	console.log ("\033[31mERROR: raid-emu.cfg not found!\033[37m");
	process.exit(1);
}


// **************************************************************************************************************************************************************
// SUPPORT
// **************************************************************************************************************************************************************
function size (size)
{
	if (size == 0) return "\033[36m[Directory]\u001b[37m";
	
	if      (size <= 999 * 1024       ) size = "" + (size / 1024              ).toFixed(2) + " KB";
	else if (size <= 999 * 1024 * 1024) size = "" + (size / 1024 / 1024       ).toFixed(2) + " MB";
	else                                size = "" + (size / 1024 / 1024 / 1024).toFixed(2) + " GB";
	
	while (size.length < 9) size = " " + size;
	return "\033[36m[" + size + "]\u001b[37m";
}



// **************************************************************************************************************************************************************
// GET SELF IP
// **************************************************************************************************************************************************************
function get_self_ip ()
{
	let list = os.networkInterfaces();
	if (list.ethernet != undefined) return list.ethernet[1].address;
	for (let key in list)  if (list[key][1].address != "127.0.0.1") return list[key][1].address;
	return undefined;
}


// **************************************************************************************************************************************************************
// PRESS ANY KEY
// **************************************************************************************************************************************************************
async function press_any_key ()
{
	process.stdin.setRawMode(true);
	console.log("\033[33m\nPress any key to start sync!\033[37m");
	return new Promise(resolve => process.stdin.once('data', () => 
	{
		process.stdin.setRawMode(false)
		resolve()
	}));
}



// **************************************************************************************************************************************************************
// WEB SERVER
// **************************************************************************************************************************************************************
if (options.web_interface == "true")
{
	var server = new http.Server
	(
		function(req, res)
		{
			fs.readFile (".\\web\\" + req.url, function (err, data)
			{
				if (err)
				{
					let route  = req.url.split('?')[0];
					let params = {};
					let tmp = req.url.split('?')[1];
					
					if (tmp != undefined)
					{
						tmp = tmp.split('&');
					}
					else
					{
						res.writeHead(404, {'Content-Type': 'text/plain'});
						res.end("WEB SERVER: Error 404! Use ip/index_eng.html or ip/index_rus.html");
						return;
					}
					
					for (let x = 0; x < tmp.length; x++) params[tmp[x].split('=')[0]] = tmp[x].split('=')[1];
					
					if (route == "/get_request")
					{
						get_request (params, res);
						return;
					}
					res.writeHead(404, {'Content-Type': 'text/plain'});
					res.end("WEB SERVER: Error 404! File not found");
				}
				else
				{
					let ext = req.url.split(".");
					ext = ext[ext.length - 1];
					
					let content_type = "";
					
					if      (ext == "css" ) content_type = "text/css";
					else if (ext == "js"  ) content_type = "application/javascript";
					else if (ext == "html") content_type = "text/html";
					else content_type = "text/plain";
					
					res.writeHead(200, {'Content-Type': content_type});
					res.end(data);
				}
			});
		}
	);

	server.listen(80);

	console.log ("WEB interface -> RUS version located at \033[36m" + get_self_ip() + "/index_rus.html" + "\033[37m");
	console.log ("WEB interface -> ENG version located at \033[36m" + get_self_ip() + "/index_eng.html" + "\033[37m");

	function get_request (params, res)
	{
		let stop    = params.stop;
		let options = params.options;
		
		let answer = 
		{
			src_address:           src.address,
			src_online:            src.online,
			src_free_space:        src.free_space,
			src_files_count:       src.files_count,
			src_folders_count:     src.folders_count,
			src_tree_updated_flag: src.tree_updated_flag,
			
			dst_address:           dst.address,
			dst_online:            dst.online,
			dst_free_space:        dst.free_space,
			dst_files_count:       dst.files_count,
			dst_folders_count:     dst.folders_count,
			dst_tree_updated_flag: dst.tree_updated_flag,
			
			sync: sync
		}
		
		res.setHeader("Content-Type", "application/json");
		res.end(JSON.stringify(answer));
	};
}
else
{
	console.log ("WEB interface -> OFF");
}
// **************************************************************************************************************************************************************
// CHECK SOURCE FOLDER
// **************************************************************************************************************************************************************
if (process.argv[2] != undefined) src.address = process.argv[2]; else src.address = options.source_path;

if (fs.existsSync(src.address))
{
	console.log ("SRC folder    -> \033[36m" + src.address + "\033[37m");
	src.online = true;
}
else
{
	src.online = false;
	console.log ("\033[31mSRC folder    -> does not exist!\033[37m " + src.address);
	process.exit(1);
}

// **************************************************************************************************************************************************************
// CHECK DESTINATION FOLDER
// **************************************************************************************************************************************************************
if (process.argv[3] != undefined) dst.address = process.argv[3]; else dst.address = options.destination_path;

if (fs.existsSync(dst.address))
{
	console.log ("DST folder    -> \033[36m" + dst.address + "\033[37m");
	dst.online = true;
}
else
{
	dst.online = false;
	console.log ("\033[31mDST folder   -> does not exist!\033[37m " + dst.address);
	process.exit(1);
}






// **************************************************************************************************************************************************************
async function SRC_make_tree_recursive (address, tree, level)
{	
	let stats;
	let tmp;
	
	return new Promise(async function (resolve, reject)
	{
		try
		{
			tmp = await fsp.readdir (address);
			
			for (let x = 0; x < tmp.length; x++)
			{
				stats = await fsp.stat(address + "\\" + tmp[x]);
				
				tree[tmp[x]] = {};
				tree[tmp[x]].inc = {};
				tree[tmp[x]].file = stats.isFile();
				
				if (tree[tmp[x]].file == true)
				{
					src.files_count++;
					tree[tmp[x]].size = stats["size"];
					if (options.console_stage1_show == "true") console.log (level + " " + size(stats["size"]) + " " + address + "\\" + tmp[x]);
				}
				else
				{
					if (options.console_stage1_show == "true") console.log (level + " " + size(0) + " \033[33m" + address + "\\" + tmp[x] + "\033[37m");
					src.folders_count++;
					await SRC_make_tree_recursive(address + "\\" + tmp[x], tree[tmp[x]].inc, level + 1);
				}
			}
			resolve("OK");
		}
		catch (err)
		{
			reject (err);
		}
	});
}



// **************************************************************************************************************************************************************
async function DST_make_tree_recursive (address, tree, level)
{	
	let stats;
	let tmp;
	
	return new Promise(async function (resolve, reject)
	{
		try
		{
			tmp = await fsp.readdir (address);
			
			for (let x = 0; x < tmp.length; x++)
			{
				if (tmp[x] == "$TEMP$") continue;
				
				stats = await fsp.stat(address + "\\" + tmp[x]);
				
				tree[tmp[x]] = {};
				tree[tmp[x]].inc = {};
				tree[tmp[x]].file = stats.isFile();
				
				if (tree[tmp[x]].file == true)
				{
					dst.files_count++;
					tree[tmp[x]].size = stats["size"];
					if (options.console_stage2_show == "true") console.log (level + " " + size(stats["size"]) + " " + address + "\\" + tmp[x]);
				}
				else
				{
					if (options.console_stage2_show == "true") console.log (level + " " + size(0) + " \033[33m" + address + "\\" + tmp[x] + "\033[37m");
					dst.folders_count++;
					await DST_make_tree_recursive(address + "\\" + tmp[x], tree[tmp[x]].inc, level + 1);
				}
			}
			resolve("OK");
		}
		catch (err)
		{
			reject(err);
		}
	});
}



// **************************************************************************************************************************************************************
function MARKER_create_new_recursive (dst_address, dst_tree, src_tree, level)
{
	for (let key in src_tree)
	{
		// if SRC & DST not match
		if (dst_tree[key] == undefined)
		{
			dst_tree[key]      = {};
			dst_tree[key].task = "new";
			dst_tree[key].file = src_tree[key].file;
			dst_tree[key].size = src_tree[key].size;
			
			if (src_tree[key].file == false)
			{
				dst_tree[key].inc = {};
				MARKER_create_new_recursive (dst_address + "\\" + key, dst_tree[key].inc, src_tree[key].inc, level + 1);
			}

		}
		// if SRC & DST match
		else
		{
			if (src_tree[key].file == true)
			{
				if (src_tree[key].size != dst_tree[key].size)
				{
					dst_tree[key].task = "new";
					
					if      (src_tree[key].size > dst_tree[key].size) dst_tree[key].key_new_size = "bigger";
					else if (src_tree[key].size < dst_tree[key].size) dst_tree[key].key_new_size = "smaller";
				}
				else 
				{
					dst_tree[key].task = "none";
				}
			}
			else
			// IF FOLDER -> LEVEL UP
			{
				dst_tree[key].task = "none";
				MARKER_create_new_recursive (dst_address + "\\" + key, dst_tree[key].inc, src_tree[key].inc, level + 1);
			}
		}
	}
}

// **************************************************************************************************************************************************************
function MARKER_delete_old_recursive (dst_address, dst_tree, src_tree, level)
{
	for (let key in dst_tree)
	{
		if (src_tree[key] == undefined)
		{
			dst_tree[key].task = "del";
			
			// FOLDER
			if (dst_tree[key].file == false)
			{
				src_tree[key] = {};
				src_tree[key].inc = {};
				
				MARKER_delete_old_recursive (dst_address + "\\" + key, dst_tree[key].inc, src_tree[key].inc, level + 1);
			}
		}
		else
		{
			// IF FOLDER -> LEVEL UP
			if (dst_tree[key].file == false) MARKER_delete_old_recursive (dst_address + "\\" + key, dst_tree[key].inc, src_tree[key].inc, level + 1);
		}
	}
}


// **************************************************************************************************************************************************************
function MARKER_show_result_recursive (dst_address, dst_tree, level)
{
	for (let key in dst_tree)
	{
		// IF FILE
		if (dst_tree[key].file == true)
		{
			if (dst_tree[key].task == "new")
			{
				MARKER_new_files++;
				if (dst_tree[key].size != undefined) sync.files_size_total_new += dst_tree[key].size;
				
				if (dst_tree[key].key_new_size != undefined)
				{
					if (options.console_stage3_show == "true") console.log (level + " " + size(dst_tree[key].size) + " [" + dst_address + "\\" + key + "] -> \033[32mnew [src file is " + dst_tree[key].key_new_size + "]\033[37m");
				}
				else
				{
					if (options.console_stage3_show == "true") console.log (level + " " + size(dst_tree[key].size) + " [" + dst_address + "\\" + key + "] -> \033[32mnew\033[37m");
				}		
			}
			else if (dst_tree[key].task == "del")
			{
				MARKER_del_files++;
				if (options.console_stage3_show == "true") console.log (level + " " + size(dst_tree[key].size) + " [" + dst_address + "\\" + key + "]\033[37m -> \033[31mdel\033[37m");
				if (dst_tree[key].size != undefined) sync.files_size_total_del += dst_tree[key].size;
			}
			
		}
		// IF FOLDER
		else
		{
			if (dst_tree[key].task == "new")
			{
				MARKER_new_folders++;
				if (options.console_stage3_show == "true") console.log (level + " " + size(0) + " \033[33m[" + dst_address + "\\" + key + "]\033[37m -> \033[32mnew\033[37m");
			}
			else if (dst_tree[key].task == "del")
			{
				MARKER_del_folders++;
				if (options.console_stage3_show == "true") console.log (level + " " + size(0) + " \033[33m[" + dst_address + "\\" + key + "]\033[37m -> \033[31mdel\033[37m");
			}
			MARKER_show_result_recursive (dst_address + "\\" + key, dst_tree[key].inc, level + 1);
		}
	}
	sync.files_size_left = sync.files_size_total_new;
}







// **************************************************************************************************************************************************************
async function SYNC_delete_old_recursive (dst_address, dst_tree, level)
{
	let list;
	
	return new Promise(async function (resolve, reject)
	{
		try
		{
			for (let key in dst_tree)
			{
				if (dst_tree[key].task == "del")
				{
					// FOLDER
					if (dst_tree[key].file == false)
					{	
						list = Object.keys(dst_tree[key].inc);
						
						if (list.length > 0) await SYNC_delete_old_recursive (dst_address + "\\" + key, dst_tree[key].inc, level + 1);
						
						await fsp.rmdir (dst_address + "\\" + key);
						if (options.console_stage4_show == "true") console.log (level + " " + size(0) + " [" + dst_address + "\\" + key + "]");
						
						sync.deleted_folders++;
						dst.folders_count--;
					}
					// FILE
					else
					{
						if (recycler_folder_list[key] != undefined) // check file in recycler before copy it to recycler TO AVOID ERROR
						{
							await fsp.unlink (dst_address + "\\" + key);
						}
						else // move file to recycler
						{
							await fsp.rename (dst_address + "\\" + key, dst.address + "\\$TEMP$\\" + key);
							recycler_folder_list[key] = {};
							recycler_folder_list[key].size = dst_tree[key].size;
						}
						
						if (options.console_stage4_show == "true") console.log (level + " " + size(dst_tree[key].size) +" [" + dst_address + "\\" + key + "]");
						sync.deleted_files++;
						dst.files_count--;
					}
				}
				else if (dst_tree[key].task == "none")
				{
					// LEVEL UP FOLDER
					if (dst_tree[key].file == false) await SYNC_delete_old_recursive (dst_address + "\\" + key, dst_tree[key].inc, level + 1);
				}
			}
			
			resolve ("OK");
		}
		catch(err)
		{
			reject (err);
		}
	});
}



















// **************************************************************************************************************************************************************
async function SYNC_create_new_recursive (dst_address, dst_tree, src_address, level)
{
	return new Promise(async function (resolve, reject)
	{
		try
		{
			for (let key in dst_tree)
			{
				if (dst_tree[key].task == "new")
				{
					// FOLDER
					if (dst_tree[key].file == false)
					{	
						await fsp.mkdir (dst_address + "\\" + key);
						if (options.console_stage5_show == "true") console.log ("MAKE " + size(0) + " \033[33m[" + key + "]\033[37m -> New directory");
						sync.new_folders++;
						dst.folders_count++;
						
						// LEVEL UP FOLDER
						await SYNC_create_new_recursive (dst_address + "\\" + key, dst_tree[key].inc, src_address + "\\" + key, level + 1);
					}
					// FILE
					else if (dst_tree[key].file == true)
					{
						seconds = parseInt(process.hrtime.bigint());
						seconds_ = 0; // for interval function
						
						sync.current_file_name = dst_address + "\\" + key;
						sync.current_file_size = Math.round(dst_tree[key].size / 1024 / 1024);
						
						// IF FILE EXISTS IN TMP FOLDER
						if (recycler_folder_list[key] != undefined && recycler_folder_list[key].size == dst_tree[key].size)
						{
							if (options.console_stage5_show == "true") process.stdout.write ("MOVE " + size(dst_tree[key].size) + " [" + src_address + "\\" + key + "] ... ");
							await fsp.rename (dst.address + "\\$TEMP$\\" + key, dst_address + "\\" + key);
							recycler_folder_list[key] = undefined; // clear file name in temp (recycler) folder
						}
						// IF FILE NOT EXISTS IN TMP FOLDER -> COPY FROM SRC
						else
						{
							if (options.console_stage5_show == "true") process.stdout.write ("COPY " + size(dst_tree[key].size) + " [" + src_address + "\\" + key + "] ... ");
							await fsp.copyFile (src_address + "\\" + key, dst_address + "\\" + key);
						}
						
						seconds = (parseInt(process.hrtime.bigint()) - seconds) / 1000000000;
						sync.current_speed_mbs = ((dst_tree[key].size / 1024 / 1024) / seconds).toFixed(2); // compute current file speed
						sync.average_speed_mbs = (((sync.files_size_total_new - sync.files_size_left) / sync.time_passed) / 1024 / 1024).toFixed(2);
						sync.new_files++;
						dst.files_count++;
						sync.files_size_left -= dst_tree[key].size; 
						
						if (options.console_stage5_show == "true") process.stdout.write (seconds.toFixed(2) + " sec / " + sync.current_speed_mbs + " MB/s [" + sync.average_speed_mbs + " MB/s]\n");
					}
				}
				else if (dst_tree[key].task == "none")
				{
					// LEVEL UP FOLDER
					if (dst_tree[key].file == false) await SYNC_create_new_recursive (dst_address + "\\" + key, dst_tree[key].inc, src_address + "\\" + key, level + 1);
				}
			}
			sync.current_file_name = "";
			sync.current_file_size = 0;
			resolve ("OK");
		}
		catch (err)
		{
			reject (err);
		}
	});
}










// **************************************************************************************************************************************************************
async function clear_tmp_folder_list ()
{
	return new Promise(async function (resolve, reject)
	{
		try
		{
			let stats;
			
			recycler_folder_list = await fsp.readdir (dst.address + "\\$TEMP$");
			
			for (let x = 0; x < recycler_folder_list.length; x++)
			{
				stats = await fsp.stat(dst.address + "\\$TEMP$\\" + recycler_folder_list[x]);
				
				if (stats.isFile() == true) await fsp.unlink (dst.address + "\\$TEMP$\\" + recycler_folder_list[x]);
			}
			
			resolve ("OK");
		}
		catch (err)
		{
			reject (err);
		}
	});
}















setTimeout (sequence, 1000);

setInterval (function()
{
	// TOTAL PROGRESS IN PERCENT
	if (sync.files_size_total != 0)
	{
		sync.total_progress = Math.round(100 - (sync.files_size_left / (sync.files_size_total_new / 100)));
		if (sync.total_progress > 100) sync.total_progress = 100;
		if (sync.total_progress <   0) sync.total_progress = 0;
	}
	else
	{
		sync.total_progress = 100;
	}
	
	// CURRENT FILE PROGRESS IN PERCENT
	if (sync.current_file_name != "")
	{
		seconds_ += 0.5;
		
		sync.current_file_progress = Math.round((seconds_ * sync.average_speed_mbs) / (sync.current_file_size / 100));
		if (sync.current_file_progress > 100) sync.current_file_progress = 100;
		if (sync.current_file_progress <   0) sync.current_file_progress =   0;
	}
	else
	{
		sync.current_file_progress = 0;
	}
	
	// TIME LEFT
	sync.time_left = (sync.files_size_left / 1024 / 1024) / sync.average_speed_mbs;
	if (sync.time_left < 0) sync.time_left = 0;
}, 500);


setInterval (function()
{
	
	if      (sync.status == "COMPLETE") sync.next_sync_in -= 1;
	else if (sync.status == "RUNNING" ) sync.time_passed  += 1;
	
	if (sync.next_sync_in < 0)
	{
		sync.status = "RUNNING";
		sync.next_sync_in  = parseInt(options.sync_update_period);
		sequence ();
	}
}, 1000);





// ==========================================================
// DISPATCHER
// ==========================================================
async function sequence ()
{
	if (sync.status == "NOT_STARTED") await press_any_key ();
	
	src.files_count            = 0;
	src.folders_count          = 0;
	src.tree_updated_flag      = "NO";
	src.tree                   = {};
	
	dst.files_count            = 0;
	dst.folders_count          = 0;
	dst.tree_updated_flag      = "NO";
	dst.tree                   = {};
	
	sync.speed_mbs             = 0;
	sync.total_progress        = 0;
	sync.new_folders           = 0;
	sync.new_files             = 0;
	sync.deleted_folders       = 0;
	sync.deleted_files         = 0;
	sync.files_size_total_new  = 0;
	sync.files_size_total_del  = 0;
	sync.files_size_left       = 0;
	sync.current_file_name     = "";
	sync.current_file_size     = 0;
	sync.current_file_progress = 0;
	sync.passed_time           = 0;
	sync.status                = "RUNNING";
	
	// **************************
	try
	{
		if (fs.existsSync(dst.address + "\\$TEMP$") === false) fs.mkdirSync (dst.address + "\\$TEMP$");
	}
	catch (err)
	{
		console.log ("\n\033[31m>> ERROR -> Can`t create temp folder!\033[37m\n" + err);
		return;
	}
	
	
	// **************************
	try
	{
		await clear_tmp_folder_list ();
	}
	catch (err)
	{
		console.log ("\n\033[31m>> ERROR -> Can`t clear temp folder!\033[37m\n" + err);
		return;
	}
	
	// **************************
	try
	{
		console.log("\n\033[32m ====================================================");
		console.log          ("| STAGE 1                                            |");
		console.log          ("| CREATING A FILES TREE OF SOURCE POINT              |");
		console.log          (" ====================================================\033[37m");
		await SRC_make_tree_recursive(src.address, src.tree, 0);
		console.log ("\n\033[36m>> Files: " + src.files_count + "\n>> Dirs:  " + src.folders_count + "\033[37m");
		src.tree_updated_flag = "YES";
	}
	catch (err)
	{
		console.log ("\n\033[31m>> ERROR!\033[37m\n" + err);
		src.online = 0;
		return;
	}
		
		
		
	// **************************
	try
	{
		console.log("\n\033[32m ====================================================");
		console.log          ("| STAGE 2                                            |");
		console.log          ("| CREATING A FILES TREE OF DESTINATION POINT         |");
		console.log          (" ====================================================\033[37m");
		await DST_make_tree_recursive(dst.address, dst.tree, 0);
		console.log ("\n\033[36m>> Files: " + dst.files_count + "\n>> Dirs:  " + dst.folders_count + "\033[37m");
		dst.tree_updated_flag = "YES";
		
	}
	catch (err)
	{
		console.log ("\n\033[31m>> ERROR!\033[37m\n" + err);
		dst.online = 0;
		return;
	}



	// **************************
	console.log("\n\033[32m ====================================================");
	console.log          ("| STAGE 3                                            |");
	console.log          ("| TREES COMPARISON FOR NEW AND DELETED ELEMENTS      |");
	console.log          (" ====================================================\033[37m");
	
	MARKER_create_new_recursive  (dst.address, dst.tree, src.tree, 0);
	MARKER_delete_old_recursive  (dst.address, dst.tree, src.tree, 0);
	MARKER_show_result_recursive (dst.address, dst.tree, 0);
	
	console.log ("\n\033[36m>> New files: " + MARKER_new_files + " [" + (sync.files_size_total_new / 1024 / 1024).toFixed(2) + " MB]\n>> New dirs:  " + MARKER_new_folders + "\033[37m");
	console.log ("\n\033[36m>> Del files: " + MARKER_del_files + " [" + (sync.files_size_total_del / 1024 / 1024).toFixed(2) + " MB]\n>> Del dirs:  " + MARKER_del_folders + "\033[37m");
	


	// **************************
	console.log("\n\033[32m ====================================================");
	console.log          ("| STAGE 4                                            |");
	console.log          ("| SYNC PROCESS                                       |");
	console.log          ("| DELETE OLD ELEMENTS ON DESTINATION POINT           |");
	console.log          (" ====================================================\033[37m");
	
	try
	{
		await SYNC_delete_old_recursive (dst.address, dst.tree, 0);
		console.log ("\n\033[36m>> Files: " + sync.deleted_files + "\n>> Dirs:  " + sync.deleted_folders + "\033[37m");
	}
	catch (err)
	{
		console.log ("\n\033[31m>> ERROR!\033[37m\n" + err);
		return;
	}

	
	
	
	// **********************
	console.log("\n\033[32m ====================================================");
	console.log          ("| STAGE 5                                            |");
	console.log          ("| SYNC PROCESS                                       |");
	console.log          ("| COPY NEW ELEMENTS TO DESTINATION POINT             |");
	console.log          (" ====================================================\033[37m");
	try
	{
		await SYNC_create_new_recursive (dst.address, dst.tree, src.address, 0);
		console.log ("\n\033[36m>> Files: " + sync.new_files + "\n>> Dirs:  " + sync.new_folders + "\n\n\033[32m>> Sync complete in " + Math.floor(sync.passed_time) + " sec.");
		if (options.close_after_sync == "false") console.log (">> Next sync in " + sync.next_sync_in + " sec.\033[37m");
	}
	catch (err)
	{
		console.log ("\n\033[31m>> ERROR!\033[37m\n" + err);
		return;
	}
	
	
	
	// ******************************************************
	try
	{
		await clear_tmp_folder_list ();
	}
	catch (err)
	{
		console.log ("\n\033[31m>> ERROR!\033[37m\n" + err);
		return;
	}
	
	sync.status = "COMPLETE";
	
	if (options.close_after_sync == "true")
	{
		fs.rmdirSync (dst.address + "\\$TEMP$\\");
		console.log (">> $TEMP$ successfully deleted!");
		process.exit(0);
	}
}
  





	