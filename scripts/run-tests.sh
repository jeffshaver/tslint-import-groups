# Compile the rules
npx tsc

# Run each directory of tests
for D in `find test/rules/import-groups-rule -type d`
do
  npx tslint --test ${D}
done