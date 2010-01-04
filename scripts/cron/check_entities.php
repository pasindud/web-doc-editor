<?php

/***
* This script is intended to be placed in a cronjob.
* It must be run every Thursday, at 01hOO for example.
* On Unix, you can use crontab -e and place this :
* 00 01 * * 4 /usr/bin/php /path/to/your/vcs/dir/doc-editor/scripts/cron/check_entities.php
****/

require_once dirname(__FILE__) . '/../../php/conf.inc.php';
require_once dirname(__FILE__) . '/../../php/LockFile.php';
require_once dirname(__FILE__) . '/../../php/ProjectManager.php';
require_once dirname(__FILE__) . '/../../php/RepositoryManager.php';
require_once dirname(__FILE__) . '/../../php/ToolsCheckEntities.php';

$rm = RepositoryManager::getInstance();
$pm = ProjectManager::getInstance();
$availableProject = $pm->getAvailableProject();

while( list($key, $project) = each($availableProject) ) {

    // Define it as a project
    $pm->setProject($project['code']);

    $lock = new LockFile('project_' . $project['code'] . '_lock_check_entities');

    if ($lock->lock()) {

        ToolsCheckEntities::getInstance()->startCheck();

    }
    // Remove the lock File
    $lock->release();;
    
    // Set lastUpdate date/time
    $rm->setLastUpdate('entities');
}

?>