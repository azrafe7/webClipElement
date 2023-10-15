 # CHANGELOG

 ### v0.2.0 (15 Oct 2023)
 - update picker to latest
 - inject in top frame only
 - use an iframe overlay when enabled
 - works on sites with multiple frames
 - better close detection
 - better highlight and info

 ### v0.1.6 (25 Sep 2023)
 - disable picker on right click

 ### v0.1.5 (24 Sep 2023)
 - less noise in console (only log if DEBUG == true)
 - change picker cursor when holding SHIFT
 - trigger on "mouseup"

 ### v0.1.3 (21 Sep 2023)
 - add 'take page screenshot...' to action button context menu

 ### v0.1.2 (18 Aug 2023)
 - hold SHIFT to continue clipping
 - set hoverBoxInfo id

 ### v0.1.1 (17 Aug 2023)
 - trigger action on click instead of mouseup
 - update picker
 - add/remove event listeners on enable/disable
 - more reliably hide overlay before taking screenshot

 ### v0.1.0 (13 Aug 2023)
 - enable/disable picker instead of recreating it
 - remove unnecessary permissions
 - make it work on zoomed pages
 - correctly crop only visible part of the element
 - add hoverBoxInfo
 - change overlay color to light green
 - fix bug with elementPicker returning early even if triggered