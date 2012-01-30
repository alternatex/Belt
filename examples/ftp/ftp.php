<?php 
namespace util;

/**
 * ftp - s* ftp client
 * 
 * @author Gianni Furger <gianni.furger@gmail.com> 
 * @version $Id$ 
 */ 
 
class ftp {
	
	/**
	* protocol string eg. ftp, ftps.
	* @var string
	*/
	private $protocol='ftp';
	
	/**
	* username 
	* @var string
	*/	
	private $user='anonymous';
	
	/**
	* password
	* @var string
	*/		
	private $pass='';
	
	/**
	* hostname or IP-address
	* @var string
	*/		
	private $host;
	
	/**
	* port
	* @var number
	*/		
	private $port=21;
	
	/**
	* home directory
	* @var string
	*/		
	private $home = '/';
	
	/**
	* home directory
	* @var string
	*/		
	private $connection_id = null;
	
	/**
	* mime-helper
	* @var object
	*/	
	private $finfo = null;

	/**
	* __construct
	* @return void   
	*/	
	function __construct($host, $user, $pass){
		// assign
		$this->host = $host;
		$this->user = $user;
		$this->pass = $pass;
		
		// attach mime detector
		$this->finfo = finfo_open(FILEINFO_MIME);	
	}	
	
	/**
	* open
	* @return Boolean   
	*/
	function open(){
		$this->connection_id = ftp_connect($this->host);
		return ftp_login($this->connection_id, $this->user, $this->pass);	
	}	

	/**
	* read
	* @return Boolean   
	*/	
	function read($dir){		
		$read = $this->dir($dir);
		return $read;
	}		


	/**
	* change directory
	* @return Boolean   
	*/	
	function dir($dir){		
		return ftp_chdir($this->connection_id, $dir);
	}		


	/**
	* upload
	* @return Boolean   
	*/	
	function upload($sourceFile, $targetFile){
		ftp_put($this->connection_id, $targetFile, $sourceFile, (substr(trim(finfo_file($this->finfo, $sourceFile)), 0, 4) == 'text'?FTP_ASCII:FTP_BINARY));
		return $this;
	}
	
	/**
	* download
	* @return Boolean   
	*/
	function download($targetFile, $sourceFile){
		ftp_get($this->connection_id, $sourceFile, $targetFile, FTP_BINARY);
		return $this;		
	}	
	
	/**
	* close
	* @return Boolean   
	*/	
	function close(){
		ftp_quit($this->connection_id);
	}

	/**
	* toString 
	* @desc Yep; it's needed for real..
	* @return String   
	*/		
	function toString(){
		return "...";		
	}
}
?>