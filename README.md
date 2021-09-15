# JPEG-HIDER

## How does it work?

Every JPEG file bytecode starts with SOI (Start Of Image) bytes 0xFF, 0xD8
![START BYTES IMG](/doc/startbytes.png)

and ends with EOI (End Of Image) bytes 0xFF, 0xD9

![END BYTES IMG](/doc/endbytes.png)

So immediately after "reading" the EOI bytes, the image displaying program is not interested in the next bytes. Thanks to this, in the next bytes you can encode whatever you want, in the case of this program - a secret message or a completely different photo or several photos. Without hex code analysis, such a photo looks like a completely normal photo without arousing any suspicions.

## Running

First it has to be compiled by typescript compiler

```shell scripts
npm install
tsc hider.ts
```

then you can use it with one of the five modes

## Hiding

```shell scripts
node hider.js --mode=hide <photo1> <photo2> <photo3>...
```

It will hide other photos inside photo `hidden.jpg` that looks like `<photo1>`. It will also keep original photo names so after extracting every photo will keep it's original name.

![hide photo](/doc/hide.png)

between 0xFF, 0xD9 pair (End Of Image) and 0xFF, 0xD8 (Start Of Image) there is a buffer that contains original photo name (on the right side of the image original name `panda.jpg` can be seen)
after the 0xFF, 0xD8 next photo buffer starts but it will be ignored by image displaying programs.

## Extracting

```shell scripts
node hider.js --mode=extract <photo>
```

The opposite of a hider. All photos that were hidden in `<photo>` will be unpacked into the `extracted` folder keeping their original names.

## Messages

Saving

```shell scripts
node hider.js --mode=savemessage <photo> <message>
```

Reading

```shell scripts
node hider.js --mode=readmessage <photo>
```

Removing

```shell scripts
node hider.js --mode=removemessage <photo>
```

![terminal ](/doc/terminal.png)
