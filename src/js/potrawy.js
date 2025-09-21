const dishes = [];

export function addDish(data) {
  new Dish({
    name: data.name,
    tags: data.tags.split(","),
  });
}

class Dish {
  constructor({ name = "NOT SPECIFIED", tags = [] } = {}) {
    this.name = name;
    this.tags = tags;

    dishes.push(this);
  }
}

export default dishes; // Eksportuj tablicę potraw

window.dane = () => {
  console.log(dishes);
};
