var PhDOE = function()
{
    Ext.QuickTips.init();

    return {

        /**
         * Hold user's variable such as login, configuration or email
         */
        user : {
            userID: null,
            login: null,
            anonymousIdent: null,
            isAnonymous: null,
            authService: null,
            authServiceID: null,
            isAdmin: false,
            lang: null,
            conf: '',
            email: ''
        },
        
        topic : {
            global: {
                author: '',
                content: '',
                topicDate: ''
            },
            lang: {
                author: '',
                content: '',
                topicDate: ''
            }
        },
        
        
        /**
         * Hold application's variable such as name, version or configuration
         */
        app: {
            name: 'Php Docbook Online Editor',
            ver : 'X.XX',
            loaded: false,
            uiRevision: '$Revision$',
            conf: ''
        },

        lastInfoDate : null,

        project    : '',

        FNTfilePendingOpen   : [],
        FNUfilePendingOpen   : [],
        FEfilePendingOpen    : [],
        FNRfilePendingOpen   : [],
        FNIENfilePendingOpen : [],
        AFfilePendingOpen    : [],
        PPfilePendingOpen    : [],

        init : function()
        {
            // We load the configuration for this user
            new ui.task.LoadConfigTask();

            // Set up automatic CSRF token appending for most requests
            Ext.Ajax.extraParams = { csrfToken: csrfToken };
            Ext.data.Connection.prototype.extraParams = { csrfToken: csrfToken };
            Ext.data.ScriptTagProxy.prototype.extraParams = { csrfToken: csrfToken };
        },

        notify : function (type, title, message) {

            var _notify, iconCls;

            if( type == 'info' ) {
                iconCls = 'iconInfo';
            }

            if( type == 'error' ) {
                iconCls = 'iconError';
            }

            _notify = new Ext.ux.Notification({
                iconCls     : iconCls,
                title       : title,
                html        : message,
                autoDestroy : true,
                hideDelay   :  5000
            });

            _notify.show(document); 

        },

        winForbidden : function(type)
        {
            var title = _('Forbidden'),
                mess  = '';

            switch (type) {
                case 'fs_error' :
                    title = _('Error');
                    mess  = _('File system error. Check read/write permission under data folder.');
                    break;
                case 'encoding_error' :
                    title = _('Error');
                    mess  = _('You have used characters that require the use of UTF-8 despite the XML header.<br>Please delete these characters or change the header of the XML file in UTF-8 ; i.e.:<br><br><center><i>&lt;?xml version="1.0" encoding="utf-8"?&gt;</i></center>');
                    break;
                case 'tabs_found' :
                    title = _('Error');
                    mess  = _('It seems that you have inserted some tabs caracters into this files. Please, replace each one by one space.<br>Tip: You can use the "Re-indent all this file" button to replace all tabs by spaces.');
                    break;
                case 'folder_already_exist' :
                    title = _('Error');
                    mess  = _('This folder already exist in the current folder.');
                    break;
                case 'file_already_exist' :
                    title = _('Error');
                    mess  = _('This file already exist in the current folder.');
                    break;
                case 'save_you_cant_modify_it' :
                    title = _('Error');
                    mess  = _('You can\'t modify this file as it was modify by another user. Contact an administrator if you want to be able to modify it.');
                    break;
                case 'file_isnt_owned_by_current_user' :
                    title = _('Error');
                    mess  = _('The file you want to clear local change isn\'t own by you.<br>You can only do this action for yours files.');
                    break;
                case 'file_localchange_didnt_exist' :
                    title = _('Error');
                    mess  = _('The file you want to clear local change isn\'t exist as work in progress.');
                    break;
                case 'changeFilesOwnerNotAdmin' :
                    title = _('Error');
                    mess  = _('You can\'t change file\'s owner. You must be a global administrator or an administrator for this lang.');
                    break;
                case 'patch_delete_dont_exist' :
                    title = _('Error');
                    mess  = _('The patch you want to delete didn\'t exist.');
                    break;
                case 'patch_delete_isnt_own_by_current_user' :
                    title = _('Error');
                    mess  = _('The patch you want to delete isn\'t own by you. Only the user how create it or a global administrator can delete it.');
                    break;
                case 'action_only_global_admin' :
                    title = _('Error');
                    mess  = _('This action is available only to global administrator.');
                    break;
                case 'action_only_admin' :
                    title = _('Error');
                    mess  = _('This action is available only to global administrator or to administrator for this lang.');
                    break;

            }

            Ext.MessageBox.alert(
                title,
                mess
            );
        },

        runDirectAccess: function()
        {
            if (directAccess) {
                if( directAccess.link == 'perm' ) {
                    ui.cmp.RepositoryTree.getInstance().openFile('byPath',
                        directAccess.lang + directAccess.path,
                        directAccess.name
                    );
                }
                if( directAccess.link == 'patch' ) {
                    Ext.getCmp('main-panel').openDiffTab({
                        DiffType: 'file',
                        FilePath: directAccess.path,
                        FileName: directAccess.name
                    });
                }
                if( directAccess.link == 'patchID' ) {
                    Ext.getCmp('main-panel').openDiffTab({
                        DiffType: 'file',
                        patchID: directAccess.patchID,
                        patchName: directAccess.patchName
                    });
                }
            }
        },

        // All we want to do after all dataStore are loaded
        afterLoadAllStore : function()
        {
            this.app.loaded = true;

            // Run DirectAccess if present
            this.runDirectAccess();

            //Load external data
            // Mails ?
            if( this.user.conf.main.loadMailsAtStartUp ) {
                ui.cmp.PortletLocalMail.getInstance().reloadData();
            }
            // Bugs ?
            if( this.user.conf.main.loadBugsAtStartUp ) {
                ui.cmp.PortletBugs.getInstance().reloadData();
            }
            
            // We set the Topic
            PhDOE.setTopic();
            PhDOE.setTopic(true);
        },

        loadAllStore : function()
        {
            var progressBar = new Ext.ProgressBar({
                    width:300,
                    renderTo:'loading-progressBar'
                }),
                items = [],
                cascadeCallback;

            // Store to load for LANG project
            if (PhDOE.user.lang !== 'en') {
                // We load all stores, one after the others
                items = [
                    ui.cmp._MainMenu.store,
                    ui.cmp.StaleFileGrid.getInstance().store,
                    ui.cmp.ErrorFileGrid.getInstance().store,
                    ui.cmp.PendingReviewGrid.getInstance().store,
                    ui.cmp.NotInENGrid.getInstance().store,
                    ui.cmp.PortletSummary.getInstance().store,
                    ui.cmp.PortletTranslationGraph.getInstance().store,
                    ui.cmp.PortletTranslationsGraph.getInstance().store,
                    ui.cmp.PortletTranslator.getInstance().store,
                    ui.cmp.PendingTranslateGrid.getInstance().store,
                    ui.cmp.PortletInfo.getInstance().store
                ];
            } else {
                // Store to load only for EN project
                items = [
                    ui.cmp._MainMenu.store,
                    ui.cmp.PortletTranslationsGraph.getInstance().store,
                    ui.cmp.ErrorFileGrid.getInstance().store,
                    ui.cmp.PortletInfo.getInstance().store
                ];


            }

            // after i iteration call i+1 iteration, while i < items.length
            cascadeCallback = function(i) {
                progressBar.updateProgress((i+1)/items.length, (i+1) + ' of ' + items.length + '...');
                items[i].load({
                    callback: function() {
                        i++;
                        if (i < items.length) {
                            cascadeCallback(i);
                        } else {
                            // Now, we can to remove the global mask
                            Ext.get('loading').remove();
                            Ext.fly('loading-mask').fadeOut({ remove : true });
                            progressBar.destroy();
                            PhDOE.afterLoadAllStore();
                        }
                    }
                });
            }

            progressBar.show();
            document.getElementById("loading-msg").innerHTML = "Loading data...";
            cascadeCallback(0);

        },

        reloadAllStore: function() {

            var items = [], cascadeCallback;

            // Store to reload for LANG project
            if (PhDOE.user.lang !== 'en') {
                // We reload all stores, one after the others

                items = [
                    ui.cmp.PendingTranslateGrid.getInstance().store,
                    ui.cmp.StaleFileGrid.getInstance().store,
                    ui.cmp.ErrorFileGrid.getInstance().store,
                    ui.cmp.PendingReviewGrid.getInstance().store,
                    ui.cmp.NotInENGrid.getInstance().store,
                    ui.cmp.WorkTreeGrid.getInstance().getRootNode(),
                    ui.cmp.PatchesTreeGrid.getInstance().getRootNode(),
                    ui.cmp.PortletSummary.getInstance().store,
                    ui.cmp.PortletTranslator.getInstance().store,
                    ui.cmp.PortletTranslationGraph.getInstance().store,
                    ui.cmp.PortletTranslationsGraph.getInstance().store,
                    ui.cmp.PortletInfo.getInstance().store
                ];

            } else {
                // Store to reload only for EN project
                items = [
                    ui.cmp.WorkTreeGrid.getInstance().getRootNode(),
                    ui.cmp.PatchesTreeGrid.getInstance().getRootNode(),
                    ui.cmp.PortletInfo.getInstance().store
                ];
            }

            // after i iteration call i+1 iteration, while i < items.length
            cascadeCallback = function(i) {
                items[i].reload(function() {
                        i++;
                        if (i < items.length) {
                            cascadeCallback(i);
                        }
                });
            }

            cascadeCallback(0);


        },

        saveTopic: function(content, isLang) {
            ui.task.setTopicTask({
                content: content,
                isLang: isLang
            });
        },
        
        setTopic: function(isLang) {
            var topic = PhDOE.topic[isLang ? 'lang' : 'global'];
            Ext.get('topic-info-content' + (isLang ? '-lang' : '')).dom.innerHTML = topic.content;
            Ext.get('topic-info-user' + (isLang ? '-lang' : '')).dom.innerHTML = String.format(_('Defined by {0}, {1}'), topic.author,topic.topicDate);
            
        },
        
        drawInterface: function()
        {
            var portal, portalEN, portalLANG, mainContentLeft=[], mainContentRight=[], allPortlet=[];
            
            // Default value for portalEN & portalLANG sort

            portalEN = {
                'col1' : ["portletLocalMail","portletBugs"],
                'col2' : ["portletInfo","portletTranslationsGraph"]
            };
            
            portalLANG = {
                'col1' : ["portletSummary","portletTranslator","portletLocalMail","portletBugs"],
                'col2' : ["portletInfo","portletTranslationGraph","portletTranslationsGraph"]
            };
            
            // Get user conf
            if ( PhDOE.user.lang === 'en' ) {
                portal = (PhDOE.user.conf.main.portalSortEN) ? Ext.util.JSON.decode(PhDOE.user.conf.main.portalSortEN) : portalEN;

                allPortlet["portletLocalMail"] = ui.cmp.PortletLocalMail.getInstance({lang: PhDOE.user.lang});
                allPortlet["portletBugs"] = ui.cmp.PortletBugs.getInstance({lang: PhDOE.user.lang});
                allPortlet["portletInfo"] = ui.cmp.PortletInfo.getInstance();
                allPortlet["portletTranslationsGraph"] = ui.cmp.PortletTranslationsGraph.getInstance();
            }
            else
            {
                portal = (PhDOE.user.conf.main.portalSortLANG) ? Ext.util.JSON.decode(PhDOE.user.conf.main.portalSortLANG) : portalLANG;
                
                allPortlet["portletSummary"] = ui.cmp.PortletSummary.getInstance({lang: PhDOE.user.lang});
                allPortlet["portletTranslator"] = ui.cmp.PortletTranslator.getInstance({lang: PhDOE.user.lang});
                allPortlet["portletLocalMail"] = ui.cmp.PortletLocalMail.getInstance({lang: PhDOE.user.lang});
                allPortlet["portletBugs"] = ui.cmp.PortletBugs.getInstance({lang: PhDOE.user.lang});

                allPortlet["portletInfo"] = ui.cmp.PortletInfo.getInstance();
                allPortlet["portletTranslationGraph"] = ui.cmp.PortletTranslationGraph.getInstance();
                allPortlet["portletTranslationsGraph"] = ui.cmp.PortletTranslationsGraph.getInstance();
            }


            for( var i=0; i < portal.col1.length; i++ ) {
                mainContentLeft.push(allPortlet[portal.col1[i]]);
            }
            for( var j=0; j < portal.col2.length; j++ ) {
                mainContentRight.push(allPortlet[portal.col2[j]]);
            }

            // We keel alive our session by sending a ping every minute
            ui.task.PingTask.getInstance().delay(30000); // start after 1 minute.

            new Ext.Viewport({
                layout : 'border',
                id     : 'main-app',
                items  : [{
                    // logo
                    region     : 'north',
                    html       : '<h1 class="x-panel-header">' +
                                    '<img src="themes/img/mini_php.png" ' +
                                        'style="vertical-align: middle;" />&nbsp;&nbsp;' +
                                    this.app.name +
                                 '</h1>',
                    autoHeight : true,
                    border     : false,
                    margins    : '0 0 5 0'
                }, {
                    // accordion
                    region       : 'west',
                    id           : 'main-menu-panel',
                    layout       : 'accordion',
                    collapsible  : true,
                    collapseMode : 'mini',
                    animate      : true,
                    split        : true,
                    width        : PhDOE.user.conf.main.mainMenuWidth || 300,
                    header       : false,
                    listeners    : {
                        resize : function(a, newWidth) {

                            if( newWidth && newWidth != PhDOE.user.conf.main.mainMenuWidth ) { // As the type is different, we can't use !== to compare with !
                                var tmp = new ui.task.UpdateConfTask({
                                    module   : 'main',
                                    itemName : 'mainMenuWidth',
                                    value : newWidth,
                                    notify: false
                                });
                            }
                        }
                    },
                    tbar : [{
                        text    : _('Main menu'),
                        iconCls : 'MainMenu',
                        menu    : new ui.cmp.MainMenu()
                    }],
                    items : [{
                        id        : 'acc-need-translate',
                        title     : _('Files need translate') + ' (<em id="acc-need-translate-nb">0</em>)',
                        layout    : 'fit',
                        border    : false,
                        iconCls   : 'iconFilesNeedTranslate',
                        hidden    : (PhDOE.user.lang === 'en'),
                        items     : [ ui.cmp.PendingTranslateGrid.getInstance() ],
                        collapsed : true,
                        listeners : {
                            expand: function(cmp) {
                                Ext.getCmp('FNT-filter').wrap.setWidth(180);
                                Ext.getCmp('FNT-filter').syncSize();
                            }
                        }
                    },{
                        id        : 'acc-need-update',
                        title     : _('Files need update') + ' (<em id="acc-need-update-nb">0</em>)',
                        layout    : 'fit',
                        border    : false,
                        iconCls   : 'iconFilesNeedUpdate',
                        hidden    : (PhDOE.user.lang === 'en'),
                        items     : [ ui.cmp.StaleFileGrid.getInstance() ],
                        collapsed : true,
                        listeners : {
                            expand: function(cmp) {
                                Ext.getCmp('FNU-filter').wrap.setWidth(180);
                                Ext.getCmp('FNU-filter').syncSize();
                            }
                        }
                    }, {
                        id        : 'acc-error',
                        title     : (PhDOE.user.lang === 'en') ? "Number of failures to meet 'strict standards'" + ' (<em id="acc-error-nb">0</em>)' : _('Error in current translation') + ' (<em id="acc-error-nb">0</em>)',
                        layout    : 'fit',
                        border    : false,
                        iconCls   : 'iconFilesError',
                        items     : [ ui.cmp.ErrorFileGrid.getInstance() ],
                        collapsed : true,
                        listeners : {
                            expand: function(cmp) {
                                Ext.getCmp('FE-filter').wrap.setWidth(180);
                                Ext.getCmp('FE-filter').syncSize();
                            }
                        }
                    }, {
                        id        : 'acc-need-reviewed',
                        title     : _('Files need reviewed') + ' (<em id="acc-need-reviewed-nb">0</em>)',
                        layout    : 'fit',
                        border    : false,
                        iconCls   : 'iconFilesNeedReviewed',
                        hidden    : (PhDOE.user.lang === 'en'),
                        items     : [ ui.cmp.PendingReviewGrid.getInstance() ],
                        collapsed : true,
                        listeners : {
                            expand: function(cmp) {
                                Ext.getCmp('FNR-filter').wrap.setWidth(180);
                                Ext.getCmp('FNR-filter').syncSize();
                            }
                        }
                    }, {
                        id        : 'acc-notInEn',
                        title     : _('Not in EN tree') + ' (<em id="acc-notInEn-nb">0</em>)',
                        layout    : 'fit',
                        border    : false,
                        iconCls   : 'iconNotInEn',
                        hidden    : (PhDOE.user.lang === 'en'),
                        items     : [ ui.cmp.NotInENGrid.getInstance() ],
                        collapsed : true
                    }, {
                        id        : 'acc-all-files',
                        title     : _('All files'),
                        layout    : 'fit',
                        border    : false,
                        iconCls   : 'iconAllFiles',
                        items     : [ ui.cmp.RepositoryTree.getInstance() ],
                        collapsed : true,
                        listeners : {
                            expand: function(cmp) {
                                Ext.getCmp('AF-search').wrap.setWidth(180);
                                Ext.getCmp('AF-search').syncSize();
                            }
                        }
                    }, {
                        id        : 'acc-work-in-progress',
                        title     : _('Work in progress') + ' (<em id="acc-work-in-progress-nb" qtip="'+_('Total number of your files')+'">0</em>)',
                        layout    : 'fit',
                        border    : false,
                        iconCls   : 'iconWorkInProgress',
                        items     : [ ui.cmp.WorkTreeGrid.getInstance() ],
                        collapsed : true,
                        tools     : [{
                            id      : 'refresh',
                            qtip    : _('Refresh'),
                            handler : function() {
                                ui.cmp.WorkTreeGrid.getInstance().getRootNode().reload();
                            }
                            
                        }]
                    }, {
                        id        : 'acc-patches',
                        tools     : [{
                            id      : 'refresh',
                            qtip    : _('Refresh'),
                            handler : function() {
                                ui.cmp.PatchesTreeGrid.getInstance().getRootNode().reload();
                            }
                            
                        },{
                            id      : 'gear',
                            hidden  : (this.user.isAnonymous ),
                            qtip    : _('Open the Log Message Manager'),
                            handler : function() {
                                if( ! Ext.getCmp('commit-log-win') )
                                {
                                    var win = new ui.cmp.CommitLogManager();
                                }
                                Ext.getCmp('commit-log-win').show('acc-patches');
                            }
                        }],
                        title     : _('Patches for review') + ' (<em id="acc-patches-nb" qtip="'+_('Total number of your files')+'">0</em>)',
                        layout    : 'fit',
                        border    : false,
                        iconCls   : 'iconPatch',
                        items     : [ ui.cmp.PatchesTreeGrid.getInstance() ],
                        collapsed : true
                    }, {
                        id        : 'acc-google-translate',
                        title     : _('Google translation'),
                        layout    : 'fit',
                        border    : false,
                        iconCls   : 'iconGoogle',
                        hidden    : (PhDOE.user.lang === 'en'),
                        items     : [ new ui.cmp.GoogleTranslationPanel() ],
                        collapsed : true
                    }]
                }, {
                    // main panel
                    xtype  : 'mainpanel',
                    id     : 'main-panel',
                    region : 'center',
                    items  : [{
                        xtype      : 'panel',
                        id         : 'MainInfoTabPanel',
                        title      : _('Home'),
                        baseCls    : 'MainInfoTabPanel',
                        autoScroll : true,
                        plain      : true,
                        items      : [{
                            xtype  : 'container',
                            layout: 'column',
                            border : false,
                            items: [{
                                xtype:'container',
                                columnWidth: .5,
                                html   : '<div class="topic-connected"><div class="x-box-tl"><div class="x-box-tr"><div class="x-box-tc"></div></div></div><div class="x-box-ml"><div class="x-box-mr"><div class="x-box-mc">' +
                                        '<h3>'+
                                        _('Connected as')+
                                        ' <em id="loginLibel"></em>' +
                                            ', ' + _('Project: ') + '<em id="Info-Project">' + PhDOE.project + '</em>, '+_('Language: ')+' <em id="Info-Language">-</em>'+
                                        '</h3>' +
                                     '</div></div></div><div class="x-box-bl"><div class="x-box-br"><div class="x-box-bc"></div></div></div></div>',
                                 listeners: {
                                    afterrender: function(cmp) {
                                    
                                        var ttContent='', libelContent='', loginLibelEl;
                                        
                                        // Build libel content
                                        loginLibelEl = Ext.get('loginLibel');
                                        
                                        if( PhDOE.user.isGlobalAdmin || PhDOE.user.isLangAdmin ) {
                                            loginLibelEl.addClass('userAdmin');
                                            libelContent = '<img src="themes/img/icon_php.png" style="vertical-align:middle"> '+PhDOE.user.login.ucFirst();
                                        } else if( PhDOE.user.authService == 'VCS' ) {
                                            libelContent = '<img src="themes/img/icon_php.png" style="vertical-align:middle"> '+PhDOE.user.login.ucFirst();
                                        } else if( PhDOE.user.authService == 'google' ) {
                                            libelContent = '<img src="themes/img/google.png" style="vertical-align:middle"> '+PhDOE.user.login.ucFirst();
                                        } else if( PhDOE.user.authService == 'facebook' ) {
                                            libelContent = '<img src="themes/img/icon_facebook.png" style="vertical-align:middle"> '+PhDOE.user.login.ucFirst();
                                        }
                                        loginLibelEl.dom.innerHTML = libelContent;
                                        
                                        // Build tooltip content
                                        
                                        content = _('Connected using') +' '+ PhDOE.user.authService + '<br>';
                                        
                                        content += (PhDOE.user.isGlobalAdmin) ? _('You are a global Administrator')+'<br>' : '';
                                        content += (PhDOE.user.isLangAdmin) ? _('You are an administrator for this language')+'<br>' : '';
                                        
                                        new Ext.ToolTip({
                                            target: 'loginLibel',
                                            anchor: 'top',
                                            html: content
                                        }); 
                                    }
                                 }
                            },{
                                xtype:'container',
                                columnWidth: .5,
                                html   : '<div class="topic-info"><div class="x-box-tl"><div class="x-box-tr"><div class="x-box-tc"></div></div></div><div class="x-box-ml"><div class="x-box-mr"><div class="x-box-mc">' +
                                            '<div id="topic-info-container">' +
                                                '<h3>'+_('Topic:')+'</h3>' +
                                                '<p id="topic-info-content">-</p>' +
                                                '<div id="topic-info-user">-</div>' +
                                            '</div>' +
                                            '<div id="topic-info-container-lang">' +
                                                '<h3><em id="Topic-Language">-</em>' +_('Topic:')+'</h3>' +
                                                '<p id="topic-info-content-lang">-</p>' +
                                                '<div id="topic-info-user-lang">-</div>' +
                                            '</div>' +
                                        '</div></div></div><div class="x-box-bl"><div class="x-box-br"><div class="x-box-bc"></div></div></div></div>',
                                listeners: {
                                    afterrender: function(c) {
                                        // Don't allow anonymous to modify the topic
                                        if( PhDOE.user.isAnonymous ) {
                                            return;
                                        }

                                        var editTopic = function(isLang) {

                                            var contentElName = 'topic-info-content' + (isLang ? '-lang' : ''),
                                                topicContent = Ext.get(contentElName).dom.innerHTML;

                                            Ext.get(contentElName).dom.innerHTML = '';

                                            new Ext.FormPanel({
                                                renderTo: contentElName,
                                                layout:'anchor',
                                                border: false,
                                                items:[{
                                                    xtype:'htmleditor',
                                                    value:topicContent,
                                                    anchor: '100%'
                                                }],
                                                buttonAlign:'center',
                                                buttons:[{
                                                    text:_('Save'),
                                                    handler: function() {
                                                        PhDOE.saveTopic(this.ownerCt.ownerCt.items.items[0].getValue(), isLang);
                                                    }
                                                },{
                                                    text:_('Cancel'),
                                                    handler: function() {
                                                        PhDOE.setTopic(isLang);
                                                    }
                                                }]
                                            });
                                        };

                                        Ext.get('topic-info-container').on('dblclick', function() {
                                            editTopic();
                                        });
                                        Ext.get('topic-info-container-lang').on('dblclick', function() {
                                            editTopic(true);
                                        });
                                    }
                                }
                            }]
                            

                        }, {
                            xtype  : 'portal',
                            border : false,
                            items  : [{
                                columnWidth : 0.5,
                                style       : 'padding:10px 5px 10px 5px',
                                items       : mainContentLeft
                            },{
                                columnWidth : 0.5,
                                style       : 'padding:10px 5px 10px 5px',
                                items       : mainContentRight
                            }],
                            listeners : {
                                drop : function(a) {
                                    var portal, col1Sort = [], col2Sort = [], id;

                                    // Column 1
                                    for( var i=0; i < a.portal.items.items[0].items.items.length; i++ ) {
                                        id = a.portal.items.items[0].items.items[i].id;
                                        col1Sort.push(id);
                                    }
                                    
                                    // Column 2
                                    for( var j=0; j < a.portal.items.items[1].items.items.length; j++ ) {
                                        id = a.portal.items.items[1].items.items[j].id;
                                        col2Sort.push(id);
                                    }

                                    portal = {
                                        'col1' : col1Sort,
                                        'col2' : col2Sort
                                    };
                                    
                                    // We store this config var into portalSortEN for EN users, and portalSortLANG for LANG users

                                    new ui.task.UpdateConfTask({
                                        module:'main',
                                        itemName  : (PhDOE.user.lang === 'en') ? 'portalSortEN' : 'portalSortLANG',
                                        value : Ext.util.JSON.encode(portal),
                                        notify: false
                                    });
                                    
                                }
                            }
                        }]
                    }]
                }]
            });

            new Ext.dd.DropTarget(Ext.get('main-panel'), {
                ddGroup    : 'mainPanelDDGroup',
                notifyDrop : function(ddSource, e, data) {

                    var i, idToOpen;

                    // Special case for the repositoryTree
                    if( data.nodes ) {
                        for( i=0; i < data.nodes.length; i++ ) {
                            PhDOE.AFfilePendingOpen[i] = {
                                nodeID: data.nodes[i].attributes.id
                            };
                        }
                        
                        // Start the first
                        ui.cmp.RepositoryTree.getInstance().openFile(
                            'byId',
                            PhDOE.AFfilePendingOpen[0].nodeID,
                            false
                        );

                        PhDOE.AFfilePendingOpen.shift();
                        return true;
                    }

                    // Special case for PendingCommit grid. As this grid can open a file in all modules, we can't use this mechanism. As it, we have disable the possibility to open multi-files. Just one can be open at once.
                    if( data.grid.ownerCt.id === 'acc-need-pendingCommit' ) {
                        data.grid.openFile(data.selections[0].data.id);
                        return true;
                    }

                    // We store the data
                    for( i=0; i < data.selections.length; i++ ) {
                        if( data.grid.ownerCt.id === 'acc-need-translate' ) {
                            PhDOE.FNTfilePendingOpen[i] = { id: data.selections[i].data.id };
                        }
                        if( data.grid.ownerCt.id === 'acc-need-update' ) {
                            PhDOE.FNUfilePendingOpen[i] = { id: data.selections[i].data.id };
                        }
                        if( data.grid.ownerCt.id === 'acc-error' ) {
                            PhDOE.FEfilePendingOpen[i] = { id: data.selections[i].data.id };
                        }
                        if( data.grid.ownerCt.id === 'acc-need-reviewed' ) {
                            PhDOE.FNRfilePendingOpen[i] = { id: data.selections[i].data.id };
                        }
                        if( data.grid.ownerCt.id === 'acc-notInEn' ) {
                            PhDOE.FNIENfilePendingOpen[i] = { id: data.selections[i].data.id };
                        }
                        if( data.grid.ownerCt.id === 'acc-need-pendingPatch' ) {
                            PhDOE.PPfilePendingOpen[i] = { id: data.selections[i].data.id };
                        }
                        if( data.grid.ownerCt.id === 'acc-need-pendingPatch' ) {
                            PhDOE.PPfilePendingOpen[i] = { id: data.selections[i].data.id };
                        }
                    }

                    // We open the first file

                    if( data.grid.ownerCt.id === 'acc-need-translate' ) {
                        idToOpen = PhDOE.FNTfilePendingOpen[0];
                        // We delete this from pending
                        PhDOE.FNTfilePendingOpen.shift();
                    }
                    if( data.grid.ownerCt.id === 'acc-need-update' ) {
                        idToOpen = PhDOE.FNUfilePendingOpen[0];
                        // We delete this from pending
                        PhDOE.FNUfilePendingOpen.shift();
                    }
                    if( data.grid.ownerCt.id === 'acc-error' ) {
                        idToOpen = PhDOE.FEfilePendingOpen[0];
                        // We delete this from pending
                        PhDOE.FEfilePendingOpen.shift();
                    }
                    if( data.grid.ownerCt.id === 'acc-need-reviewed' ) {
                        idToOpen = PhDOE.FNRfilePendingOpen[0];
                        // We delete this from pending
                        PhDOE.FNRfilePendingOpen.shift();
                    }
                    if( data.grid.ownerCt.id === 'acc-notInEn' ) {
                        idToOpen = PhDOE.FNIENfilePendingOpen[0];
                        // We delete this from pending
                        PhDOE.FNIENfilePendingOpen.shift();
                    }
                    if( data.grid.ownerCt.id === 'acc-need-pendingPatch' ) {
                        idToOpen = PhDOE.PPfilePendingOpen[0];
                        // We delete this from pending
                        PhDOE.PPfilePendingOpen.shift();
                    }

                    data.grid.openFile(idToOpen.id);

                    return true;
                }
            });

            // Load all store & remove the mask after all store are loaded
            this.loadAllStore();

        } // drawInterface
    }; // Return
}();

Ext.EventManager.onDocumentReady(PhDOE.init, PhDOE, true);
