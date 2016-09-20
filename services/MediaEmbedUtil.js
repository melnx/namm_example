module.exports = {
    MediaEmbedUtil: function($sce){
        this.getYoutubeUrl = function(url){
            var video_id = url.split('v=')[1];
            var ampersandPosition = video_id.indexOf('&');
            if(ampersandPosition != -1) {
                video_id = video_id.substring(0, ampersandPosition);
            }
            return $sce.trustAsResourceUrl( 'https://www.youtube.com/embed/' + video_id );
        }

        this.getSoundcloudUrl = function(url){
            return $sce.trustAsResourceUrl( 'https://w.soundcloud.com/player/?url=' + encodeURIComponent(url) + '&amp;auto_play=false&amp;hide_related=false&amp;show_comments=true&amp;show_user=true&amp;show_reposts=false&amp;visual=true' );
        }
    }
}
