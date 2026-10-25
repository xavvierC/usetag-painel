export type Client = {
  id: string;
  name: string;
  cpf: string;
  phone: string;
  email: string;
  street: string;
  number: string;
  complement: string;
  district: string;
  city: string;
  uf: string;
  cep: string;
  archived: boolean;
};
export function blankClient(id = crypto.randomUUID()): Client {
  return {
    id,
    name: "",
    cpf: "",
    phone: "",
    email: "",
    street: "",
    number: "",
    complement: "",
    district: "",
    city: "",
    uf: "",
    cep: "",
    archived: false,
  };
}
