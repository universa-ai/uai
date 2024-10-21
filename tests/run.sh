bun test tests/extractJsonFromJSX.spec.tsx 2> tests/stderr.txt > tests/stdout.txt

cat tests/stdout.txt
echo "--------------"
cat tests/stderr.txt
