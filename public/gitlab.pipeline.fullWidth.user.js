// ==UserScript==
// @name           Gitlab - Pipeline full width
// @namespace      gitlab
// @version        4.2.3
// @updateURL      https://anmiles.net/userscripts/gitlab.pipeline.fullWidth.user.js
// @downloadURL    https://anmiles.net/userscripts/gitlab.pipeline.fullWidth.user.js
// @description    Make pipeline main block full width and compact jobs to fit the page as much as possible
// @description:ru Контент-блок пайплайна занимает всю свободную ширину и джобы умещаются на одной странице, насколько это возможно
// @section        Gitlab
// @author         Anatoliy Oblauhov
// @match          https://gitlab.com/*/pipelines*
// @require        https://code.jquery.com/jquery-3.3.1.min.js
// @grant          none
// ==/UserScript==

(function($){
    const maxJobs = 11;

    $('<style type="text/css"></style>')
    .text('\
        .gl-tab-content { padding: 0; } \
        .page-content-header, .detail-page-header { padding: 8px 0 !important; }\
        .content-wrapper { padding-bottom: 0; }\
        .container-limited { max-width: none !important; padding: 0 16px; }\
        .js-pipeline-container { width: 100%; }\
        .js-pipeline-graph > div { margin: -1px -16px; padding: 1rem 0.5rem 0 0.5rem; }\
        .tab-pane.pipelines .ci-table table { table-layout: unset; width: unset; }\
        .tab-pane.pipelines .ci-table table th, .tab-pane.pipelines .ci-table table td { white-space: nowrap; padding: 0.5rem !important; }\
        .tab-pane.pipelines .ci-table table th[aria-colindex="2"], .tab-pane.pipelines .ci-table table td[aria-colindex="2"] { width: 100%; white-space: normal; }\
        .tab-pane.pipelines .ci-table table th[aria-colindex="2"] .gl-text-truncate, .tab-pane.pipelines .ci-table table td[aria-colindex="2"] .gl-text-truncate { white-space: normal; }\
        .tab-pane.pipelines .flex-truncate-child { flex-grow: 1; }\
        .commit-box { padding: 8px 0; }\
        .commit-title { font-size: 1.25em; line-height: 2em;}\
        .commit-description { display: none; }\
        .info-well { margin-bottom: 0; }\
        .info-well:after { display: block; content: ""; clear: both; }\
        .info-well .well-segment { white-space: nowrap; padding: 8px; float: right; }\
        .info-well .well-segment.pipeline-info { float: left; }\
        .info-well .well-segment.branch-info { clear: right; }\
        .info-well .well-segment.related-merge-request-info { float: left; clear: left; }\
        .breadcrumbs { display: none; }\
        .gl-downstream-pipeline-job-width { width: auto; } \
        .gl-downstream-pipeline-job-width + div { display: none;  } \
        [data-testid="stage-column"] { padding: 0; } \
        [data-testid="linked-column-title"], [data-testid="stage-column"] > div:first-child { margin-top: -8px; margin-bottom: 8px; }\
        [data-testid="stage-column"] .gl-text-truncate.gl-pr-9 { padding-right: 0; min-width: 64px; }\
        [data-testid="stage-column"] > div.gl-flex-direction-column { display: block; column-gap: 0; } \
        [data-testid="stage-column-group"] { padding-right: 0.5em; } \
        [data-testid="stage-column-group"] button { margin-right: 0.625rem; }\
        [data-testid="linked-column-title"], [data-testid="stage-column-title"] span { line-height: 30px; } \
        .ci-job-component a { padding-right: calc(34px + 0.125rem); }\
        .gl-linked-pipeline-padding { padding-right: 0.5rem; } \
        .linked-pipelines-column { margin: 0 0.25rem; }\
    ').appendTo('head');

    setInterval(function(){
        if (window.innerWidth < 1000) return;

        $('[data-testid="stage-column"] > div.gl-flex-direction-column').map(function(i, column){
            $(column).css({
                'column-count': Math.ceil($(column).children().length / maxJobs),
                'max-height': 'calc(' + maxJobs + ' * (42px + 0.5rem))'
            });
        });
    }, 100);
})(jQuery);
