#!/bin/sh

. ./config_build.sh

echo "Checking directories: ${CHROME_PROVICERS} ${ROOT_DIRS}"

lines=`git clean -nd ${CHROME_PROVIDERS} ${ROOT_DIRS} | wc -l`
if [ x"$lines" != x"0" ]; then
	echo "Not clean; abort."
	exit 1
fi

echo "OK, go!"
exit 0

