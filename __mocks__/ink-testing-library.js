module.exports = {
  render: (component) => {
    let frameContent = '';
    return {
      lastFrame: () => frameContent,
      stdin: {
        write: (input) => {
          // Simula sugestão visível ao digitar "@fi"
          if (input.toString().includes('@') || input.toString().includes('fi')) {
            frameContent = 'file.txt';
          }
        }
      }
    };
  }
};