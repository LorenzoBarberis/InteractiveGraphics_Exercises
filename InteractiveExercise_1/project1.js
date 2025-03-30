// bgImg is the background image to be modified.
// fgImg is the foreground image.
// fgOpac is the opacity of the foreground image.
// fgPos is the position of the foreground image in pixels. It can be negative and (0,0) means the top-left pixels of the foreground and background are aligned.
function composite( bgImg, fgImg, fgOpac, fgPos )
{
    const bgData = bgImg.data;
    const fgData = fgImg.data;
    const bgWidth = bgImg.width;
    const fgWidth = fgImg.width;
    const fgHeight = fgImg.height;

    for (let y = 0; y < fgHeight; y++) {
        for (let x = 0; x < fgWidth; x++) {
            const fgIndex = (y * fgWidth + x) * 4;
            const bgX = fgPos.x + x;
            const bgY = fgPos.y + y;
            if (bgX < 0 || bgX >= bgWidth || bgY < 0 || bgY >= bgImg.height) continue;
            const bgIndex = (bgY * bgWidth + bgX) * 4;

            const fgAlpha = (fgData[fgIndex + 3] / 255) * fgOpac;
            const bgAlpha = 1 - fgAlpha;

            for (let i = 0; i < 3; i++) {
                bgData[bgIndex + i] = Math.round(
                    fgData[fgIndex + i] * fgAlpha + bgData[bgIndex + i] * bgAlpha
                );
            }
            bgData[bgIndex + 3] = Math.round((fgAlpha + bgAlpha) * 255);
        }
    }
}
