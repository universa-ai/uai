export default function () {
  return (
    <>
      <system>
        Test system message
      </system>
      <user>
        Test user message
      </user>
      <temperature value="0.7" />
      <output
        path="/Users/gur/Documents/uai/tests/output.txt"
        branch="test-branch"
      />
    </>
  );
}
