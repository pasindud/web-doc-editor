Ext.namespace('ui','ui.component');

// ViewVCDiff
// config - {prefix, fid, fpath, fname, rev1, rev2}
ui.component.ViewVCDiff = Ext.extend(Ext.Panel,
{
    layout    : 'fit',
    title     : _('Diff From VCS'),
    height    : 150,

    initComponent : function()
    {
        Ext.apply(this,
        {
            items : {
                id         : this.prefix + '-diff-' + this.fid,
                xtype      : 'panel',
                layout     : 'fit',
                items: [ new Ext.ux.IFrameComponent({ id: 'frame-' + this.prefix + '-diff-' + this.fid, url: 'http://svn.php.net/viewvc/phpdoc/en/trunk' +
                                this.fpath + this.fname +
                                '?r1=' + this.rev1 + '&r2=' + this.rev2 }) ]
            }
        });
        ui.component.ViewVCDiff.superclass.initComponent.call(this);
    }
});
